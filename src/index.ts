import { Logger } from './logger/index.js'
import {
  createBundleBuilder,
  createBundleManager,
  createBundleProcessor,
} from './bundle/index.js'
import { createRpcServerWithHandlers } from './rpc/index.js'
import { createBuilderConfig } from './config/index.js'
import {
  createEthAPI,
  createWeb3API,
  createDebugAPI,
  createBundlerHandlerRegistry,
} from './rpc/index.js'
import { Libp2pNode } from './p2p/index.js'

import { createProviderService } from './provider/index.js'
import { createValidationService } from './validation/index.js'
import {
  bundlerNativeTracerName,
  createSimulator,
  prestateTracerName,
} from './sim/index.js'
import {
  createReputationManager,
  createReputationManagerUpdater,
} from './reputation/index.js'
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

const p2pNode: Libp2pNode | undefined = undefined

const stopLibp2p = async () => {
  if (p2pNode) {
    await p2pNode.stop()
  }
}

const runBundler = async () => {
  const args = process.argv
  const config = createBuilderConfig(args)
  const state = createState()
  const ps = createProviderService(config.provider, config.nativeTracerProvider)

  const { name, chainId } = await ps.getNetwork()
  const chainIdNum = Number(chainId)

  // Create services
  const epAddress = await config.entryPointContract.getAddress()
  const pvgc = createPreVerificationGasCalculator(chainIdNum)
  const sim = createSimulator(ps, epAddress)
  const vs = createValidationService(
    ps,
    sim,
    pvgc,
    epAddress,
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

  const depositManager = createDepositManager(state, config.entryPointContract)
  const mempoolManagerCore = createMempoolManagerCore(
    state,
    reputationManager,
    depositManager,
    config.bundleSize,
  )

  const eventManager = createEventManagerWithListener(
    ps,
    reputationManager,
    createMempoolManageUpdater(mempoolManagerCore),
    config.entryPointContract,
  )

  const bundleManager = createBundleManager(
    createBundleProcessor(
      ps,
      reputationManager,
      config.entryPointContract,
      config.txMode,
      config.beneficiaryAddr,
      config.minSignerBalance,
      config.bundlerSignerWallets,
    ),
    createBundleBuilder(vs, reputationManager, {
      maxBundleGas: config.maxBundleGas,
      txMode: config.txMode,
      entryPointContract: config.entryPointContract,
    }),
    eventManager,
    createMempoolManagerBuilder(mempoolManagerCore),
    createReputationManagerUpdater(reputationManager),
    config.isAutoBundle,
    config.autoBundleInterval,
  )

  // start p2p node
  if (config.isP2PMode) {
    throw new Error('P2P mode is not supported yet')
  }

  // start rpc server
  const bundlerServer = createRpcServerWithHandlers(
    createBundlerHandlerRegistry(
      createEthAPI(
        ps,
        sim,
        vs,
        eventManager,
        createMempoolManageSender(mempoolManagerCore),
        pvgc,
        config.entryPointContract,
      ),
      createWeb3API(config.clientVersion),
      createDebugAPI(
        bundleManager,
        reputationManager,
        mempoolManagerCore,
        eventManager,
        pvgc,
        config.entryPointContract,
      ),
      ps,
    ),
    config.httpApis,
    config.port,
  )
  await bundlerServer.start(async () => {
    const supportedNetworks = ps.getSupportedNetworks()
    if (!supportedNetworks.includes(chainIdNum)) {
      throw new Error(
        `Network not supported. Supported networks: ${supportedNetworks.join(
          ', ',
        )}`,
      )
    }

    // Make sure the entry point contract is deployed to the network
    if (chainIdNum === 31337 || chainIdNum === 1337) {
      const isDeployed = await ps.checkContractDeployment(epAddress)
      if (!isDeployed) {
        throw new Error(
          'Entry point contract is not deployed to the network. Please use a pre-deployed contract or deploy the contract first if you are using a local network.',
        )
      }
    }

    // Check if the signer accounts have enough balance
    const signerDetails = await Promise.all(
      Object.values(config.bundlerSignerWallets).map(async (signer) => {
        const bal = await ps.getBalance(signer.address)
        if (bal >= config.minSignerBalance) {
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
        const [
          supportsPrestateTracer,
          supportsBundlerCollectorTracer,
          isNativeTracerAndNetworkProviderChainMatch,
        ] = await Promise.all([
          sim.supportsNativeTracer(prestateTracerName),
          sim.supportsNativeTracer(bundlerNativeTracerName, true),
          ps.isNativeTracerAndNetworkProviderChainMatch(),
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

        if (!isNativeTracerAndNetworkProviderChainMatch) {
          throw new Error(
            'Native tracer provider and network provider do not match. Please make sure the native tracer provider is running on the same network as the network provider',
          )
        }
      } else {
        if (!(await sim.supportsDebugTraceCall())) {
          throw new Error(
            'Full validation requires (debug_traceCall) method on the network provider for standard javascript tracer. For UNSAFE mode: use --unsafe',
          )
        }
      }
    }

    Logger.info(
      {
        signerDetails,
        network: { chainId, name },
        mode: config.isUnsafeMode ? 'UNSAFE' : 'SAFE',
        nativeTracerEnabled: config.nativeTracerEnabled,
        txMode: config.txMode,
        version: config.clientVersion,
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
  await stopLibp2p()
})

process.on('SIGTERM', async () => {
  await stopLibp2p()
})
