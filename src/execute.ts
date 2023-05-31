import { BundleManager, BundleProcessor } from './modules/bundle'
import { Config } from './modules/config'
import { EventsManager } from './modules/event'
import { RpcMethodHandler } from './modules/json-rpc-handler'
import { EthAPI, DebugAPI, Web3API } from './modules/json-rpc-handler/services'
import { JsonrpcHttpServer } from './modules/json-rpc-server'
import { MempoolManager } from './modules/mempool'
import { ProviderService } from './modules/provider'
import { ReputationManager } from './modules/reputation'
import { ValidationService } from './modules/validation'
import { Logger } from './modules/logger'

async function runBundler() {
  const config = new Config(process.argv)
  const providerService = new ProviderService(config.provider, config.connectedWallet)

  // erc-4337 in-memory mempool
  const mempoolManager = new MempoolManager(config.bundleSize)

  // erc-4337 entity reputation components
  const reputationManager = new ReputationManager(config.minStake, config.minUnstakeDelay)
  reputationManager.addWhitelist(config.whitelist)
  reputationManager.addBlacklist(config.blacklist)

  // erc-4337 user operation bundle components
  const validationService = new ValidationService(
    providerService,
    reputationManager,
    config.entryPointContract,
    config.isUnsafeMode
  )
  const bundleProcessor = new BundleProcessor(
    providerService,
    validationService,
    reputationManager,
    mempoolManager,
    config.maxBundleGas,
    config.entryPointContract,
    config.isConditionalTxMode(),
    config.beneficiaryAddr,
    config.minSignerBalance
  )
  const bundleManager = new BundleManager(
    bundleProcessor,
    config.isAutoBundle,
    config.autoBundleInterval,
  )
  const eventsManager = new EventsManager(
    providerService,
    reputationManager,
    mempoolManager,
    config.entryPointContract,
  )

  // get rpc server components
  const eth = new EthAPI(
    config.entryPointContract,
    providerService,
    bundleManager,
    validationService,
    mempoolManager
  )
  const debug = new DebugAPI(bundleManager, reputationManager, mempoolManager)
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
    config.isConditionalTxMode(),
    config.isUnsafeMode,
    config.port
  )
  await bundlerServer.start()
}

runBundler().catch(async (error) => {
  Logger.fatal({error: error.message}, 'Aborted')
  process.exit(1)
})
