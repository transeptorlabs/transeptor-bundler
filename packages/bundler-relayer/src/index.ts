import { BundleManager, BundleProcessor } from './bundle/index.js'
import { EventsManager } from './event/index.js'
import {
  RpcMethodHandler,
  EthAPI,
  DebugAPI,
  Web3API,
} from './json-rpc-handler/index.js'
import { createRpcServer } from '../../shared/rpc-server/index.js'
import { MempoolManager } from './mempool/index.js'
import { ProviderService } from '../../shared/provider/index.js'
import { ReputationManager } from './reputation/index.js'
import { ValidationService } from '../../shared/validation/index.js'
import { Logger } from '../../shared/logger/index.js'
import { initializeConfig, getConfig } from './config/index.js'
import { MetricsHttpServer, MetricsTracker } from './metrics/index.js'
import { Libp2pNode } from './p2p/index.js'

let p2pNode: Libp2pNode = undefined

const runBundler = async () => {
  const args = process.argv
  initializeConfig(args)
  const config = getConfig()

  const providerService = new ProviderService(config.provider, config.connectedWallet)

  // erc-4337 entity reputation components
  const reputationManager = new ReputationManager(config.minStake, config.minUnstakeDelay, providerService)
  reputationManager.addWhitelist(config.whitelist)
  reputationManager.addBlacklist(config.blacklist)
  reputationManager.startHourlyCron()

  // erc-4337 in-memory mempool
  const mempoolManager = new MempoolManager(reputationManager, config.bundleSize)

  // erc-4337 user operation bundle components
  const validationService = new ValidationService(
    providerService,
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
  const debug = new DebugAPI(
    bundleManager,
    reputationManager,
    mempoolManager,
    eventsManager,
    config.entryPointContract
  )
  const web3 = new Web3API(config.clientVersion, config.isUnsafeMode)
  const rpcHandler = new RpcMethodHandler(
    eth,
    debug,
    web3,
    providerService,
    config.httpApi
  )

    // start p2p node
    if (config.isP2PMode) {
      p2pNode = new Libp2pNode(config.peerMultiaddrs, config.findPeers)
      await p2pNode.start()
    }

  // start rpc server
  const bundlerServer = createRpcServer(
    rpcHandler,
    config.port
  )
  const relayerflightCheck = async() => {
    const { name, chainId } = await providerService.getNetwork()

    if (chainId === 31337 || chainId === 1337) {
      const isDeployed = await providerService.checkContractDeployment(config.entryPointContract.address)
      if (!isDeployed) {
        throw new Error('Entry point contract is not deployed to the network. Please use a pre-deployed contract or deploy the contract first if you are using a local network.')
      }
    }
    
    const bal = await providerService.getSignerBalance()
    if (bal.eq(0)) {
      throw new Error('Bundler signer account is not funded:')
    }
  
    if (config.txMode === 'conditional' && !await providerService.supportsRpcMethod('eth_sendRawTransactionConditional')) {
      throw new Error('(conditional mode requires connection to a node that support eth_sendRawTransactionConditional')
    }
  
    // full validation requires (debug_traceCall) method on eth node geth and can only be run in private and conditional txMode
    if (config.txMode === 'searcher' && !config.isUnsafeMode && !await providerService.supportsRpcMethod('debug_traceCall')) {
      throw new Error(`${config.txMode} mode does not support full validation. Full validation requires (debug_traceCall) method on eth node geth. For local UNSAFE mode: use --unsafe --txMode base or --unsafe --txMode conditional`)
    }
  
    Logger.info(
      {
        signerAddress: await providerService.getSignerAddress(),
        signerBalanceWei: bal.toString(),
        network: {chainId, name},
      },
      'Relayer passed preflight check'
    )

  }
  await bundlerServer.start(relayerflightCheck)

  // stat metrics server
  if (config.isMetricsEnabled) {
    const metricsTracker = new MetricsTracker(config.influxdbConnection)
    const metricsServer = new MetricsHttpServer(config.metricsPort)

    await metricsServer.start()
    metricsTracker.startTracker()
  }
}

const stopLibp2p = async () => {
  if (p2pNode) {
    await p2pNode.stop()
  }
}

runBundler().catch(async (error) => {
  Logger.fatal({error: error.message}, 'Aborted')
  process.exit(1)
})

process.on('SIGTERM', async () => {
  await stopLibp2p()
})

process.on('SIGTERM', async () => {
  await stopLibp2p()
})
