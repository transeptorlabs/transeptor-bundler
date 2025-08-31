#!/user/bin/env node

import { Config, createConfig } from './config/index.js'
import {
  GethNativeTracerName,
  TRANSEPTOR_ENV_VALUES,
} from './constants/index.js'
import {
  createCoreServices,
  createManagers,
  createInternalAPIs,
  createInfrastructure,
} from './core/index.js'
import { createLogger, withModuleContext } from './logger/index.js'
import { createMempoolManageSender } from './mempool/index.js'
import { STATE_CAPABILITY_REGISTRY } from './ocaps/index.js'
import { Libp2pNodeManager } from './p2p/index.js'
import { createProviderService, ProviderService } from './provider/index.js'
import { createRpcServerWithHandlers } from './rpc/index.js'
import { AuditLogger, RpcServer, Simulator } from './types/index.js'

const logger = createLogger(TRANSEPTOR_ENV_VALUES.TRANSEPTOR_LOG_LEVEL)
let p2pNodeManager: Libp2pNodeManager | undefined = undefined
let bundlerServer: RpcServer | undefined = undefined
let auditLogger: AuditLogger | undefined = undefined

const stopLibp2p = async () => {
  if (p2pNodeManager) {
    await p2pNodeManager.stop()
    p2pNodeManager = undefined
    logger.info('P2P node stopped gracefully.')
  }
}

const stopBundlerServer = async () => {
  if (bundlerServer) {
    await bundlerServer.stop()
    bundlerServer = undefined
    logger.info('Bundler server stopped gracefully.')
  }
}

const stopAuditLogger = async () => {
  if (auditLogger) {
    await auditLogger.shutdown()
    auditLogger = undefined
    logger.info('Audit logger stopped gracefully.')
  }
}

const runPreflightChecks = async (
  config: Config,
  providerService: ProviderService,
  sim: Simulator,
) => {
  logger.info('Running node preflight checks')
  const supportedNetworks = providerService.getSupportedNetworks()
  const { chainId, name } = await providerService.getNetwork()
  const chainIdNum = Number(chainId)

  if (!supportedNetworks.includes(chainIdNum)) {
    throw new Error(
      `Network not supported. Supported networks: ${supportedNetworks.join(
        ', ',
      )}`,
    )
  }

  // Make sure the entry point contract is deployed to the network
  const [isDeployed, providerClientVersion] = await Promise.all([
    providerService.checkContractDeployment(
      providerService.getEntryPointContractDetails().address,
    ),
    providerService.clientVersion(),
  ])
  if (!isDeployed) {
    throw new Error(
      'Entry point contract is not deployed to the network. Please use a pre-deployed contract or deploy the contract first if you are using a local network.',
    )
  }

  // Check if the signer[0] account has enough balance(default signer)
  const mainSigner = providerService.getBundlerSignerWallets()[0]
  const mainSignerBalance = await providerService.getBalance(mainSigner.address)
  if (mainSignerBalance < config.minSignerBalance) {
    throw new Error(
      `Bundler signer account(${mainSigner.address}) is not funded: Min balance required: ${config.minSignerBalance}`,
    )
  }

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

  logger.info(
    {
      environment: config.environment,
      auditTrailEnabled: config.auditTrail,
      signerDetails: {
        signerAddresses: mainSigner.address,
        signerBalanceWei: mainSignerBalance.toString(),
      },
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
    'Node passed preflight checks',
  )
}

/**
 * Main function to run the bundler.
 *
 * @returns void
 */
async function runNode() {
  const args = process.argv
  const config = createConfig({
    args,
    env: TRANSEPTOR_ENV_VALUES,
  })

  if (config.isP2PMode) {
    throw new Error('P2P mode is not supported yet')
  }

  // Create infrastructure
  const { auditLogger: newAuditLogger, metricsTracker } = createInfrastructure({
    logger,
    destinationPath: config.auditLogDestinationPath,
    auditLogFlushIntervalMs: config.auditLogFlushIntervalMs,
    bufferCapacity: config.auditLogBufferSize,
    clientVersion: config.clientVersion,
    nodeCommitHash: config.commitHash,
    environment: config.environment,
    isMetricsEnabled: config.isMetricsEnabled,
    influxdbConnection: config.influxdbConnection,
    auditTrailEnabled: config.auditTrail,
  })
  auditLogger = newAuditLogger

  // Create services
  const providerService = await createProviderService({
    logger: withModuleContext('provider-service', logger),
    networkProvider: config.provider,
    supportedEntryPointAddress: config.supportedEntryPointAddress,
    signers: config.bundlerSignerWallets,
  })
  const { chainId } = await providerService.getNetwork()
  const {
    preVerificationGasCalculator,
    sim,
    validationService,
    stateService,
    bootstrapStateCapabilities,
  } = await createCoreServices({
    logger,
    isUnsafeMode: config.isUnsafeMode,
    entryPointAddress: providerService.getEntryPointContractDetails().address,
    providerService,
    chainId: Number(chainId),
    signers: config.bundlerSignerWallets,
    clientVersion: config.clientVersion,
    STATE_CAPABILITY_REGISTRY,
  })

  // Create managers
  const issuedCapabilitiesMapping = await bootstrapStateCapabilities()
  const {
    reputationManager,
    mempoolManagerCore,
    eventsManager,
    bundleManager,
  } = await createManagers({
    logger,
    auditLogger,
    providerService,
    validationService,
    stateService,
    issuedCapabilitiesMapping,
    minStake: config.minStake,
    minUnstakeDelay: config.minUnstakeDelay,
    whitelist: config.whitelist,
    blacklist: config.blacklist,
    bundleSize: config.bundleSize,
    txMode: config.txMode,
    beneficiary: config.beneficiaryAddr,
    minSignerBalance: config.minSignerBalance,
    maxBundleGas: config.maxBundleGas,
    isAutoBundle: config.isAutoBundle,
    autoBundleInterval: config.autoBundleInterval,
    chainId: Number(chainId),
  })

  // Create internal APIs
  const { handlerRegistry } = createInternalAPIs({
    logger,
    auditLogger,
    providerService,
    sim,
    validationService,
    eventsManager,
    mempoolManageSender: createMempoolManageSender(mempoolManagerCore),
    preVerificationGasCalculator,
    bundleManager,
    reputationManager,
    mempoolManagerCore,
    eip7702Support: config.eip7702Support,
    clientVersion: config.clientVersion,
    chainId: Number(chainId),
  })

  // Start RPC server
  bundlerServer = createRpcServerWithHandlers({
    handlerRegistry,
    supportedApiPrefixes: config.httpApis,
    port: config.port,
    logger: withModuleContext('rpc-server', logger),
  })

  await bundlerServer.start(() =>
    runPreflightChecks(config, providerService, sim),
  )

  // Start metrics tracker if enabled
  if (metricsTracker) {
    metricsTracker.startTracker()
  }
}

runNode().catch(async (error) => {
  logger.fatal({ error: error.message }, 'Aborted failed to start up node...')
  process.exit(1)
})

process.on('SIGTERM', async () => {
  logger.debug('Gracefully shutting down...')
  await Promise.all([stopBundlerServer(), stopLibp2p(), stopAuditLogger()])
  logger.info('Shutdown complete.')
  process.exit(0)
})
