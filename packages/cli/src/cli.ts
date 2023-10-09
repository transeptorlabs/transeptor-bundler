import { BundleManager, BundleProcessor } from 'bundle'
import { EventsManager } from 'event'
import { RpcMethodHandler, EthAPI, DebugAPI, Web3API } from 'json-rpc-handler'
import { JsonrpcHttpServer } from 'json-rpc-server'
import { MempoolManager } from 'mempool'
import { ProviderService } from 'provider'
import { ReputationManager } from 'reputation'
import { ValidationService } from 'validation'
import { Logger } from 'logger'
import { Config } from './Config'
import { MetricsHttpServer, PerformanceTracker } from 'metrics'

async function runBundler() {
  const config = new Config(process.argv)
  const providerService = new ProviderService(config.provider, config.connectedWallet)

  // erc-4337 entity reputation components
  const reputationManager = new ReputationManager(config.minStake, config.minUnstakeDelay)
  reputationManager.addWhitelist(config.whitelist)
  reputationManager.addBlacklist(config.blacklist)
  reputationManager.startHourlyCron()

  // erc-4337 in-memory mempool
  const mempoolManager = new MempoolManager(reputationManager, config.bundleSize)

  // erc-4337 user operation bundle components
  const validationService = new ValidationService(
    providerService,
    reputationManager,
    config.entryPointContract,
    config.isUnsafeMode
  )
  const eventsManager = new EventsManager(
    providerService,
    reputationManager,
    mempoolManager,
    config.entryPointContract,
  )
  const bundleProcessor = new BundleProcessor(
    providerService,
    validationService,
    reputationManager,
    mempoolManager,
    config.maxBundleGas,
    config.entryPointContract,
    config.txMode,
    config.beneficiaryAddr,
    config.minSignerBalance
  )
  const bundleManager = new BundleManager(
    bundleProcessor,
    config.isAutoBundle,
    config.autoBundleInterval,
  )

  // get rpc server components
  const eth = new EthAPI(
    config.entryPointContract,
    providerService,
    bundleManager,
    validationService,
    mempoolManager,
    eventsManager
  )
  const debug = new DebugAPI(bundleManager, reputationManager, mempoolManager, eventsManager)
  const web3 = new Web3API(config.clientVersion, config.isUnsafeMode)
  const rpcHandler = new RpcMethodHandler(
    eth,
    debug,
    web3,
    providerService,
    config.httpApi
  )

  // start rpc server
  const bundlerServer = new JsonrpcHttpServer(
    rpcHandler,
    providerService,
    config.entryPointContract,
    config.txMode,
    config.isUnsafeMode,
    config.port
  )
  await bundlerServer.start()

  // stat metrics server
  if (config.isMetricsEnabled) {
    const performanceTracker = new PerformanceTracker(config.influxdbConnection)
    const metricsServer = new MetricsHttpServer(config.metricsPort)

    await metricsServer.start()
    performanceTracker.startTracker()
  }
}

runBundler().catch(async (error) => {
  Logger.fatal({error: error.message}, 'Aborted')
  process.exit(1)
})
