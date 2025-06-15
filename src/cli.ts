#!/user/bin/env node

import {
  createAuditLogWriter,
  Logger,
  createAuditLogger,
  withModuleContext,
  createAuditLogQueue,
} from './logger/index.js'
import {
  createBundleBuilder,
  createBundleManager,
  createBundleProcessor,
} from './bundle/index.js'
import {
  createBundlerHandlerRegistry,
  createRpcServerWithHandlers,
} from './rpc/index.js'
import { createConfig } from './config/index.js'
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
import { createEventManager } from './event/index.js'
import { createState } from './state/index.js'
import { createDepositManager } from './deposit/index.js'
import { createMetricsTracker } from './metrics/index.js'
import { createPreVerificationGasCalculator } from './gas/index.js'
import { AuditLogger, RpcServer } from './types/index.js'

let p2pNode: Libp2pNode | undefined = undefined
let bundlerServer: RpcServer | undefined = undefined
let auditLogger: AuditLogger | undefined = undefined

const stopLibp2p = async () => {
  if (p2pNode) {
    await p2pNode.stop()
    p2pNode = undefined
    Logger.info('P2P node stopped gracefully.')
  }
}

const stopBundlerServer = async () => {
  if (bundlerServer) {
    await bundlerServer.stop()
    bundlerServer = undefined
    Logger.info('Bundler server stopped gracefully.')
  }
}

const stopAuditLogger = async () => {
  if (auditLogger) {
    await auditLogger.shutdown()
    auditLogger = undefined
    Logger.info('Audit logger stopped gracefully.')
  }
}

const runBundler = async () => {
  const args = process.argv
  const config = createConfig(args)
  auditLogger = createAuditLogger({
    auditLogQueue: createAuditLogQueue({
      auditLogWriter: createAuditLogWriter({
        backend: 'pino',
        destinationPath: config.auditLogDestinationPath,
        logger: withModuleContext('audit-log-writer'),
      }),
      flushIntervalMs: config.auditLogFlushIntervalMs,
      logger: withModuleContext('audit-log-queue'),
      bufferCapacity: config.auditLogBufferSize,
    }),
    clientVersion: config.clientVersion,
    nodeCommitHash: config.commitHash,
    environment: config.environment,
  })
  const state = createState()
  const providerService = await createProviderService({
    networkProvider: config.provider,
    supportedEntryPointAddress: config.supportedEntryPointAddress,
    signers: config.bundlerSignerWallets,
  })
  const entryPointAddress =
    providerService.getEntryPointContractDetails().address

  const { name, chainId } = await providerService.getNetwork()
  const chainIdNum = Number(chainId)

  // Create services
  const preVerificationGasCalculator =
    createPreVerificationGasCalculator(chainIdNum)
  const sim = createSimulator({
    providerService,
    preVerificationGasCalculator,
  })
  const validationService = createValidationService({
    logger: withModuleContext('validation'),
    providerService,
    sim,
    preVerificationGasCalculator,
    isUnsafeMode: config.isUnsafeMode,
    erc7562Parser: createErc7562Parser({
      entryPointAddress,
    }),
  })

  // Create manager instances
  const reputationManager = createReputationManager({
    providerService,
    state,
    minStake: config.minStake,
    minUnstakeDelay: config.minUnstakeDelay,
  })
  await reputationManager.addWhitelist(config.whitelist)
  await reputationManager.addBlacklist(config.blacklist)
  reputationManager.startHourlyCron()

  const depositManager = createDepositManager({ providerService, state })
  const mempoolManagerCore = createMempoolManagerCore({
    state,
    reputationManager,
    depositManager,
    bundleSize: config.bundleSize,
  })

  const eventsManager = createEventManager({
    providerService,
    reputationManager,
    mempoolManageUpdater: createMempoolManageUpdater(mempoolManagerCore),
  })

  const bundleManager = createBundleManager({
    bundleProcessor: createBundleProcessor({
      providerService,
      reputationManager,
      mempoolManagerBuilder: createMempoolManagerBuilder(mempoolManagerCore),
      txMode: config.txMode,
      beneficiary: config.beneficiaryAddr,
      minSignerBalance: config.minSignerBalance,
    }),
    bundleBuilder: createBundleBuilder({
      providerService,
      validationService,
      reputationManager,
      mempoolManagerBuilder: createMempoolManagerBuilder(mempoolManagerCore),
      opts: {
        maxBundleGas: config.maxBundleGas,
        txMode: config.txMode,
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
  bundlerServer = createRpcServerWithHandlers({
    handlerRegistry: createBundlerHandlerRegistry({
      eth: createEthAPI({
        logUserOpLifecycleEvent:
          auditLogger.logUserOpLifecycleEvent.bind(auditLogger),
        providerService,
        sim,
        validationService,
        eventsManager,
        mempoolManageSender: createMempoolManageSender(mempoolManagerCore),
        preVerificationGasCalculator,
        eip7702Support: config.eip7702Support,
      }),
      web3: createWeb3API(config.clientVersion),
      debug: createDebugAPI({
        providerService,
        bundleManager,
        reputationManager,
        mempoolManagerCore,
        eventsManager,
        preVerificationGasCalculator,
      }),
    }),
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
      providerService.checkContractDeployment(entryPointAddress),
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
  Logger.fatal({ error: error.message }, 'Aborted failed to start up node...')
  process.exit(1)
})

process.on('SIGTERM', async () => {
  Logger.debug('Gracefully shutting down...')
  await stopBundlerServer()
  await stopLibp2p()
  await stopAuditLogger()
  Logger.info('Shutdown complete.')
  process.exit(0)
})

process.on('SIGTERM', async () => {
  Logger.debug('Gracefully shutting down...')
  await stopBundlerServer()
  await stopLibp2p()
  await stopAuditLogger()
  Logger.info('Shutdown complete.')
  process.exit(0)
})
