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
import { createValidationService } from './validatation/index.js'
import { createSimulator } from './sim/index.js'
import { createSignerService } from './signer/index.js'
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

  // Create services
  const ps = createProviderService(config.provider)
  const sim = createSimulator(ps, config.entryPointContract)
  const vs = createValidationService(ps, sim, config.entryPointContract.address)

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
    createBundleBuilder(ps, vs, reputationManager, {
      maxBundleGas: config.maxBundleGas,
      isUnsafeMode: config.isUnsafeMode,
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
        config.entryPointContract,
        config.isUnsafeMode,
      ),
      createWeb3API(config.clientVersion, config.isUnsafeMode),
      createDebugAPI(
        bundleManager,
        reputationManager,
        mempoolManagerCore,
        eventManager,
        config.entryPointContract,
      ),
      ps,
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

    // safe mode: full validation requires (debug_traceCall) method on eth node geth
    if (
      !config.isUnsafeMode &&
      !(await ps.supportsRpcMethod('debug_traceCall'))
    ) {
      throw new Error(
        'Full validation requires (debug_traceCall) method on eth node geth. For local UNSAFE mode: use --unsafe',
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