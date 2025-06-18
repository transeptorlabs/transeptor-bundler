import { createReputationManager } from '../reputation/index.js'
import { createDepositManager } from '../deposit/index.js'
import {
  createMempoolManagerCore,
  createMempoolManagerBuilder,
  createMempoolManageUpdater,
} from '../mempool/index.js'
import { createEventManager, EventManager } from '../event/index.js'
import {
  createBundleManager,
  createBundleProcessor,
  createBundleBuilder,
  BundleManager,
} from '../bundle/index.js'
import {
  MempoolManagerCore,
  ReputationManager,
  StateService,
  TranseptorLogger,
  CapabilitiesService,
} from '../types/index.js'
import { withModuleContext } from '../logger/index.js'
import { ValidationService } from '../validation/index.js'
import { ProviderService } from '../provider/index.js'

export type Managers = {
  reputationManager: ReputationManager
  mempoolManagerCore: MempoolManagerCore
  eventsManager: EventManager
  bundleManager: BundleManager
}

export type ManagersConfig = {
  logger: TranseptorLogger
  providerService: ProviderService
  validationService: ValidationService
  stateService: StateService
  capabilitiesService: CapabilitiesService
  minStake: bigint
  minUnstakeDelay: bigint
  whitelist: string[]
  blacklist: string[]
  bundleSize: number
  txMode: string
  beneficiary: string
  minSignerBalance: bigint
  maxBundleGas: number
  isAutoBundle: boolean
  autoBundleInterval: number
}

export const createManagers = async (config: ManagersConfig) => {
  const {
    logger,
    providerService,
    validationService,
    stateService,
    minStake,
    minUnstakeDelay,
    whitelist,
    blacklist,
    bundleSize,
    txMode,
    beneficiary,
    minSignerBalance,
    maxBundleGas,
    isAutoBundle,
    autoBundleInterval,
  } = config
  logger.info('Initializing managers')

  const reputationManager = createReputationManager({
    logger: withModuleContext('reputation-manager', logger),
    providerService,
    state: stateService,
    minStake,
    minUnstakeDelay,
  })

  await reputationManager.addWhitelist(whitelist)
  await reputationManager.addBlacklist(blacklist)
  reputationManager.startHourlyCron()

  const depositManager = createDepositManager({
    providerService,
    state: stateService,
  })

  const mempoolManagerCore = createMempoolManagerCore({
    logger: withModuleContext('mempool-manager-core', logger),
    state: stateService,
    reputationManager,
    depositManager,
    bundleSize,
  })

  const eventsManager = createEventManager({
    logger: withModuleContext('events-manager', logger),
    providerService,
    reputationManager,
    mempoolManageUpdater: createMempoolManageUpdater(mempoolManagerCore),
  })

  const bundleManager = createBundleManager({
    bundleProcessor: createBundleProcessor({
      logger: withModuleContext('bundle-processor', logger),
      providerService,
      reputationManager,
      mempoolManagerBuilder: createMempoolManagerBuilder(mempoolManagerCore),
      txMode,
      beneficiary,
      minSignerBalance,
    }),
    bundleBuilder: createBundleBuilder({
      logger: withModuleContext('bundle-builder', logger),
      providerService,
      validationService,
      reputationManager,
      mempoolManagerBuilder: createMempoolManagerBuilder(mempoolManagerCore),
      opts: {
        maxBundleGas,
        txMode,
      },
    }),
    eventsManager,
    state: stateService,
    isAutoBundle,
    autoBundleInterval,
    logger: withModuleContext('bundle-manager', logger),
  })

  return {
    reputationManager,
    mempoolManagerCore,
    eventsManager,
    bundleManager,
  }
}
