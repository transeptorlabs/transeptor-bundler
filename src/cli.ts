#!/user/bin/env node

import { createLogger, withModuleContext } from './logger/index.js'
import { Config, createConfig } from './config/index.js'
import { createProviderService, ProviderService } from './provider/index.js'
import { createRpcServerWithHandlers } from './rpc/index.js'
import { Libp2pNode } from './p2p/index.js'
import { GethNativeTracerName } from './constants/index.js'
import { createMempoolManageSender } from './mempool/index.js'
import { AuditLogger, RpcServer, Simulator } from './types/index.js'

import {
  createCoreServices,
  createManagers,
  createInternalAPIs,
  createInfrastructure,
} from './core/index.js'

const logger = createLogger()
let p2pNode: Libp2pNode | undefined = undefined
let bundlerServer: RpcServer | undefined = undefined
let auditLogger: AuditLogger | undefined = undefined

const stopLibp2p = async () => {
  if (p2pNode) {
    await p2pNode.stop()
    p2pNode = undefined
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

  logger.info(
    {
      environment: config.environment,
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
  const config = createConfig(args)

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
  })
  auditLogger = newAuditLogger

  // Create services
  const providerService = await createProviderService({
    logger: withModuleContext('provider-service', logger),
    networkProvider: config.provider,
    supportedEntryPointAddress: config.supportedEntryPointAddress,
    txSignerPrivateKey: config.bundlerSignerWallets[0].privateKey,
  })
  const { chainId } = await providerService.getNetwork()
  const {
    preVerificationGasCalculator,
    sim,
    validationService,
    stateService,
    capabilitiesService,
  } = await createCoreServices({
    logger,
    isUnsafeMode: config.isUnsafeMode,
    entryPointAddress: providerService.getEntryPointContractDetails().address,
    providerService,
    chainId: Number(chainId),
    ocapsIssuerSignerPrivateKey: config.bundlerSignerWallets[1].privateKey,
    clientVersion: config.clientVersion,
  })

  // Create managers
  const {
    reputationManager,
    mempoolManagerCore,
    eventsManager,
    bundleManager,
  } = await createManagers({
    logger,
    providerService,
    validationService,
    stateService,
    capabilitiesService,
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
