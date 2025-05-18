#!/user/bin/env node

import { Logger } from './logger/index.js'
import {
  createBundleBuilder,
  createBundleManager,
  createBundleProcessor,
} from './bundle/index.js'
import {
  createBundlerHandlerRegistry,
  createRpcServerWithHandlers,
} from './rpc/index.js'
import { createBuilderConfig } from './config/index.js'
import { createEthAPI, createWeb3API, createDebugAPI } from './apis/index.js'
import { Libp2pNode } from './p2p/index.js'

import { createProviderService } from './provider/index.js'
import { createValidationService } from './validation/index.js'
import { createSimulator } from './sim/index.js'
import {
  bundlerNativeTracerName,
  prestateTracerName,
} from './constants/index.js'
import { createReputationManager } from './reputation/index.js'
import {
  createMempoolManagerBuilder,
  createMempoolManagerCore,
  createMempoolManageSender,
  createMempoolManageUpdater,
} from './mempool/index.js'
import { createEventManagerWithListener } from './event/event-manager-with-reputation.js'
import { createState } from './state/index.js'
import { createDepositManager } from './deposit/index.js'
import { createMetricsTracker } from './metrics/index.js'
import { createPreVerificationGasCalculator } from './gas/index.js'
import { RpcServer } from './types/index.js'

const p2pNode: Libp2pNode | undefined = undefined
let bundlerServer: RpcServer | undefined = undefined

const stopLibp2p = async () => {
  if (p2pNode) {
    await p2pNode.stop()
  }
}

const stopBundlerServer = async () => {
  if (bundlerServer) {
    await bundlerServer.stop()
  }
}

const runBundler = async () => {
  const args = process.argv
  const config = await createBuilderConfig(args)
  const state = createState()
  const providerService = createProviderService(
    config.provider,
    config.nativeTracerProvider,
  )

  const { name, chainId } = await providerService.getNetwork()
  const chainIdNum = Number(chainId)

  // Create services
  const pvgc = createPreVerificationGasCalculator(chainIdNum)
  const sim = createSimulator(providerService, config.entryPoint.address)
  const validationService = createValidationService(
    providerService,
    sim,
    pvgc,
    config.isUnsafeMode,
    config.nativeTracerEnabled,
  )

  // Create manager instances
  const reputationManager = createReputationManager(
    state,
    config.minStake,
    config.minUnstakeDelay,
    config.stakeManagerContract,
  )
  await reputationManager.addWhitelist(config.whitelist)
  await reputationManager.addBlacklist(config.blacklist)
  reputationManager.startHourlyCron()

  const depositManager = createDepositManager(state, config.entryPoint.contract)
  const mempoolManagerCore = createMempoolManagerCore(
    state,
    reputationManager,
    depositManager,
    config.bundleSize,
  )

  const eventsManager = createEventManagerWithListener(
    providerService,
    reputationManager,
    createMempoolManageUpdater(mempoolManagerCore),
    config.entryPoint.contract,
  )

  const bundleManager = createBundleManager({
    bundleProcessor: createBundleProcessor({
      providerService,
      reputationManager,
      mempoolManagerBuilder: createMempoolManagerBuilder(mempoolManagerCore),
      entryPoint: config.entryPoint,
      txMode: config.txMode,
      beneficiary: config.beneficiaryAddr,
      minSignerBalance: config.minSignerBalance,
      signers: config.bundlerSignerWallets,
    }),
    bundleBuilder: createBundleBuilder({
      validationService,
      reputationManager,
      mempoolManagerBuilder: createMempoolManagerBuilder(mempoolManagerCore),
      opts: {
        maxBundleGas: config.maxBundleGas,
        txMode: config.txMode,
        entryPointContract: config.entryPoint.contract,
        entryPointAddress: config.entryPoint.address,
      },
    }),
    eventsManager,
    state,
    isAutoBundle: config.isAutoBundle,
    autoBundleInterval: config.autoBundleInterval,
  })

  // start p2p node
  if (config.isP2PMode) {
    throw new Error('P2P mode is not supported yet')
  }

  // start rpc server
  const handlerRegistry = createBundlerHandlerRegistry({
    eth: createEthAPI({
      ps: providerService,
      sim: sim,
      vs: validationService,
      eventsManager,
      mempoolManageSender: createMempoolManageSender(mempoolManagerCore),
      pvgc,
      entryPoint: config.entryPoint,
      eip7702Support: config.eip7702Support,
    }),
    web3: createWeb3API(config.clientVersion),
    debug: createDebugAPI(
      bundleManager,
      reputationManager,
      mempoolManagerCore,
      eventsManager,
      pvgc,
      config.entryPoint.contract,
    ),
  })
  bundlerServer = createRpcServerWithHandlers({
    handlerRegistry,
    supportedApiPrefixes: config.httpApis,
    port: config.port,
  })
  await bundlerServer.start(async () => {
    const supportedNetworks = providerService.getSupportedNetworks()
    if (!supportedNetworks.includes(chainIdNum)) {
      throw new Error(
        `Network not supported. Supported networks: ${supportedNetworks.join(
          ', ',
        )}`,
      )
    }

    // Make sure the entry point contract is deployed to the network
    const isDeployed = await providerService.checkContractDeployment(
      config.entryPoint.address,
    )
    if (!isDeployed) {
      throw new Error(
        'Entry point contract is not deployed to the network. Please use a pre-deployed contract or deploy the contract first if you are using a local network.',
      )
    }

    // Check if the signer accounts have enough balance
    const signerDetails = await Promise.all(
      Object.values(config.bundlerSignerWallets).map(async (signer) => {
        const bal = await providerService.getBalance(signer.address)
        if (!(bal >= config.minSignerBalance)) {
          throw new Error(
            `Bundler signer account(${signer.address}) is not funded: Min balance required: ${config.minSignerBalance}`,
          )
        }

        return {
          signerAddresses: signer.address,
          signerBalanceWei: bal.toString(),
        }
      }),
    )

    // Validate provider supports required methods
    if (config.isUnsafeMode) {
      if (config.nativeTracerEnabled) {
        throw new Error(
          'Can not run in unsafe mode with native tracer. Please use a remote tracer',
        )
      }
    } else {
      if (config.nativeTracerEnabled) {
        const [supportsPrestateTracer, supportsBundlerCollectorTracer] =
          await Promise.all([
            sim.supportsNativeTracer(prestateTracerName), // validate standard tracer supports "prestateTracer" on provider
            sim.supportsNativeTracer(bundlerNativeTracerName, true),
          ])

        if (!supportsPrestateTracer) {
          throw new Error(
            'Full validation requires the network provider to support prestateTracer. For UNSAFE mode: use --unsafe',
          )
        }

        if (!supportsBundlerCollectorTracer) {
          throw new Error(
            'Full validation requires native tracer provider to support bundlerCollectorTracer. For UNSAFE mode: use --unsafe',
          )
        }
      } else {
        // validate standard javascript tracer supported
        const supportsDebugTraceCallRes = await sim.supportsDebugTraceCall()
        supportsDebugTraceCallRes.fold(
          (err) => {
            throw new Error(
              `Internal error when checking for traceCall support: ${err.message}`,
            )
          },
          (isSupportsDebugTraceCall) => {
            if (!isSupportsDebugTraceCall) {
              throw new Error(
                'Full validation requires (debug_traceCall) method on the network provider for standard javascript tracer. For UNSAFE mode: use --unsafe',
              )
            }
          },
        )
      }
    }

    Logger.info(
      {
        signerDetails,
        network: { chainId, name },
        mode: config.isUnsafeMode ? 'UNSAFE' : 'SAFE',
        nativeTracerEnabled: config.nativeTracerEnabled,
        txMode: config.txMode,
        bundleMode: config.isAutoBundle ? 'auto' : 'manual',
        autoBundleInterval: `${config.autoBundleInterval} ms`,
        version: config.clientVersion,
        bundleSize: config.bundleSize,
      },
      'Builder passed preflight checks',
    )
  })

  // stat metrics server
  if (config.isMetricsEnabled) {
    const metricsTracker = createMetricsTracker(config.influxdbConnection)
    metricsTracker.startTracker()
  }
}

runBundler().catch(async (error) => {
  Logger.fatal({ error: error.message }, 'Aborted')
  process.exit(1)
})

process.on('SIGTERM', async () => {
  Logger.debug('Gracefully shutting down...')
  await stopBundlerServer()
  await stopLibp2p()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  Logger.debug('Gracefully shutting down...')
  await stopBundlerServer()
  await stopLibp2p()
  process.exit(0)
})
