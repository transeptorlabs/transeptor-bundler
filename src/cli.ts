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
import { createErc7562Parser, createSimulator } from './sim/index.js'
import { GethNativeTracerName } from './constants/index.js'
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
  const providerService = createProviderService(config.provider)

  const { name, chainId } = await providerService.getNetwork()
  const chainIdNum = Number(chainId)

  // Create services
  const preVerificationGasCalculator =
    createPreVerificationGasCalculator(chainIdNum)
  const sim = createSimulator({
    providerService,
    entryPoint: config.entryPoint.contract,
    epAddress: config.entryPoint.address,
    preVerificationGasCalculator,
  })
  const validationService = createValidationService({
    providerService,
    sim,
    preVerificationGasCalculator,
    isUnsafeMode: config.isUnsafeMode,
    erc7562Parser: createErc7562Parser({
      entryPointAddress: config.entryPoint.address,
      senderCreatorAddress: config.senderCreatorAddress,
    }),
  })

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
      preVerificationGasCalculator,
      entryPoint: config.entryPoint,
      eip7702Support: config.eip7702Support,
    }),
    web3: createWeb3API(config.clientVersion),
    debug: createDebugAPI(
      bundleManager,
      reputationManager,
      mempoolManagerCore,
      eventsManager,
      preVerificationGasCalculator,
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
    const [isDeployed, providerClientVersion] = await Promise.all([
      providerService.checkContractDeployment(config.entryPoint.address),
      providerService.clientVersion(),
    ])
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

    // Ensure provider supports required debug_traceCall methods with erc7562Tracer to run full validation
    if (!config.isUnsafeMode) {
      const supportsErc7562Tracer =
        await sim.supportsDebugTraceCallWithNativeTracer(GethNativeTracerName)

      if (!supportsErc7562Tracer) {
        throw new Error(
          'Full validation requires provider to support erc7562Tracer. For UNSAFE mode: use --unsafe',
        )
      }
    }

    Logger.info(
      {
        signerDetails,
        bundleConfig: {
          mode: config.isUnsafeMode ? 'UNSAFE' : 'SAFE',
          txMode: config.txMode,
          bundleMode: config.isAutoBundle ? 'auto' : 'manual',
          autoBundleInterval: `${config.autoBundleInterval} ms`,
          bundleSize: config.bundleSize,
        },
        clientInfo: {
          providerClientVersion,
          transeptorVersion: config.clientVersion,
          network: { chainId, name },
        },
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
