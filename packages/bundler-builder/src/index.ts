import { Logger } from '../../shared/logger/index.js'
import { BundleManager, BundleProcessor } from './bundle/index.js'
import { createRpcServerWithHandlers } from '../../shared/rpc/index.js'
import { getConfig, initializeConfig } from './config/get-config.js'
import { createRelayerHandlerRegistry } from './handler/handlerRegistry.js'
import { createDebugAPI } from './handler/index.js'
import { Libp2pNode } from './p2p/index.js'

import { MempoolManager } from '../../bundler-builder/src/mempool/index.js'
import { ReputationManager } from '../../shared/reputation/index.js'
import { createProviderService } from '../../shared/provider/index.js'
import { createValidationService } from '../../shared/validatation/index.js'
import { createSimulator } from '../../shared/sim/index.js'
import { createSignerService } from './signer/index.js'
import { budlerBuilderEmitter, EventManagerWithReputation } from './event/index.js'

let p2pNode: Libp2pNode = undefined

const runBundlerBuilder = async () => {
  const args = process.argv
  initializeConfig(args)
  const config = getConfig()

  const ss = createSignerService(config.provider)
  const ps = createProviderService(config.provider)
  const sim = createSimulator(ps, config.entryPointContract)
  const vs = createValidationService(
    ps,
    sim,
    config.entryPointContract.address,
  )

  const reputationManager = new ReputationManager(config.minStake, config.minUnstakeDelay, config.stakeManagerContract)
  reputationManager.addWhitelist(config.whitelist)
  reputationManager.addBlacklist(config.blacklist)
  reputationManager.startHourlyCron()

  const mempoolManager = new MempoolManager(reputationManager, config.bundleSize)
  budlerBuilderEmitter.on('removeUserOp', async (data: string) => {
    Logger.debug(`Received (removeUserOp) event with data: ${data}...`);
    await mempoolManager.removeUserOp(data)
  });

  const eventsManager = new EventManagerWithReputation(
    ps,
    reputationManager,
    config.entryPointContract,
  )
  const bundleProcessor = new BundleProcessor(
    ps,
    vs,
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
  
  // start p2p node
  if (config.isP2PMode) {
    p2pNode = new Libp2pNode(config.peerMultiaddrs, config.findPeers)
    await p2pNode.start()
  }

  // start rpc server
  const bundlerServer = createRpcServerWithHandlers(
    createRelayerHandlerRegistry(
      createDebugAPI(
        bundleManager,
        reputationManager,
        mempoolManager,
        eventsManager,
        config.entryPointContract,
      ),
    ),
    config.httpApis,
    config.port,
  )
  await bundlerServer.start(async() => {
    const { name, chainId } = await ps.getNetwork()

    if (chainId === 31337 || chainId === 1337) {
      const isDeployed = await ps.checkContractDeployment(config.entryPointContract.address)
      if (!isDeployed) {
        throw new Error('Entry point contract is not deployed to the network. Please use a pre-deployed contract or deploy the contract first if you are using a local network.')
      }
    }
    
    const bal = await ps.getSignerBalance()
    if (bal.eq(0)) {
      throw new Error('Bundler signer account is not funded:')
    }
  
    if (config.txMode === 'conditional' && !await ps.supportsRpcMethod('eth_sendRawTransactionConditional')) {
      throw new Error('(conditional mode requires connection to a node that support eth_sendRawTransactionConditional')
    }
  
    // full validation requires (debug_traceCall) method on eth node geth and can only be run in private and conditional txMode
    if (config.txMode === 'searcher' && !config.isUnsafeMode && !await ps.supportsRpcMethod('debug_traceCall')) {
      throw new Error(`${config.txMode} mode does not support full validation. Full validation requires (debug_traceCall) method on eth node geth. For local UNSAFE mode: use --unsafe --txMode base or --unsafe --txMode conditional`)
    }
  
    Logger.info(
      {
        signerAddress: await ps.getSignerAddress(),
        signerBalanceWei: bal.toString(),
        network: {chainId, name},
      },
      'Relayer passed preflight check'
    )
  })
}

runBundlerBuilder().catch(async (error) => {
  Logger.fatal({error: error.message}, 'Aborted')
  process.exit(1)
})

const stopLibp2p = async () => {
  if (p2pNode) {
    await p2pNode.stop()
  }
}

process.on('SIGTERM', async () => {
  await stopLibp2p()
})
  
process.on('SIGTERM', async () => {
    await stopLibp2p()
})