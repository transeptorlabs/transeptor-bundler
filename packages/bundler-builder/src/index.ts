import { Logger } from '../../shared/logger/index.js'
import {
  createBundleBuilder,
  createBundleManager,
  createBundleProcessor,
} from './bundle/index.js'
import { createRpcServerWithHandlers } from '../../shared/rpc/index.js'
import { createBuilderConfig } from './config/index.js'
import { createRelayerHandlerRegistry } from './handler/handlerRegistry.js'
import { createDebugAPI } from './handler/index.js'
import { Libp2pNode } from './p2p/index.js'

import { createProviderService } from '../../shared/provider/index.js'
import { createValidationService } from '../../shared/validatation/index.js'
import { createSimulator } from '../../shared/sim/index.js'
import { createSignerService } from './signer/index.js'
import { createReputationManager } from './reputation/index.js'
import { createMempoolManager, createMempoolState } from './mempool/index.js'
import { createEventManagerWithListener } from './event/event-manager-with-reputation.js'

let p2pNode: Libp2pNode = undefined

const stopLibp2p = async () => {
  if (p2pNode) {
    await p2pNode.stop()
  }
}

const runBundlerBuilder = async () => {
  const args = process.argv
  const config = createBuilderConfig(args)
  const ps = createProviderService(config.provider)
  const sim = createSimulator(ps, config.entryPointContract)
  const mempoolState = createMempoolState()

  // Create manager instances
  const reputationManager = createReputationManager(
    mempoolState,
    config.minStake,
    config.minUnstakeDelay,
    config.stakeManagerContract,
  )
  await reputationManager.addWhitelist(config.whitelist)
  await reputationManager.addBlacklist(config.blacklist)
  reputationManager.startHourlyCron()

  const mempoolManager = createMempoolManager(
    mempoolState,
    reputationManager,
    config.bundleSize,
  )

  const eventManager = createEventManagerWithListener(
    ps,
    reputationManager,
    mempoolManager,
    config.entryPointContract,
  )

  const bundleManager = createBundleManager(
    createBundleProcessor(
      ps,
      reputationManager,
      mempoolManager,
      config.entryPointContract,
      config.txMode,
      config.beneficiaryAddr,
      config.minSignerBalance,
      config.bundlerSignerWallets,
    ),
    createBundleBuilder(
      ps,
      createValidationService(ps, sim, config.entryPointContract.address),
      reputationManager,
      mempoolManager,
      config.maxBundleGas,
      config.isUnsafeMode,
      config.txMode,
      config.entryPointContract,
    ),
    mempoolState,
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
        eventManager,
        config.entryPointContract,
      ),
      mempoolManager,
    ),
    config.httpApis,
    config.port,
  )
  await bundlerServer.start(async () => {
    const ss = createSignerService(ps)
    const { name, chainId } = await ps.getNetwork()

    // Make sure the entry point contract is deployed to the network
    if (chainId === 31337 || chainId === 1337) {
      const isDeployed = await ps.checkContractDeployment(
        config.entryPointContract.address,
      )
      if (!isDeployed) {
        throw new Error(
          'Entry point contract is not deployed to the network. Please use a pre-deployed contract or deploy the contract first if you are using a local network.',
        )
      }
    }

    // full validation requires (debug_traceCall) method on eth node geth and can only be run in private and conditional txMode
    if (
      config.txMode === 'searcher' &&
      !config.isUnsafeMode &&
      !(await ps.supportsRpcMethod('debug_traceCall'))
    ) {
      throw new Error(
        `${config.txMode} mode does not support full validation. Full validation requires (debug_traceCall) method on eth node geth. For local UNSAFE mode: use --unsafe --txMode base or --unsafe --txMode conditional`,
      )
    }

    if (
      config.txMode === 'conditional' &&
      !(await ps.supportsRpcMethod('eth_sendRawTransactionConditional'))
    ) {
      throw new Error(
        '(conditional mode requires connection to a node that support eth_sendRawTransactionConditional',
      )
    }

    // Check if the signer accounts have enough balance
    const signerDetails = await Promise.all(
      Object.values(config.bundlerSignerWallets).map(async (signer) => {
        const bal = await ss.getSignerBalance(signer)
        if (bal.eq(config.minSignerBalance)) {
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

    Logger.info(
      {
        signerDetails,
        network: { chainId, name },
      },
      'Builder passed preflight check',
    )
  })
}

runBundlerBuilder().catch(async (error) => {
  Logger.fatal({ error: error.message }, 'Aborted')
  process.exit(1)
})

process.on('SIGTERM', async () => {
  await stopLibp2p()
})

process.on('SIGTERM', async () => {
  await stopLibp2p()
})
