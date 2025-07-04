import {
  createBundleManager,
  createBundleProcessor,
  createBundleBuilder,
  BundleManager,
} from '../bundle/index.js'
import { createDepositManager } from '../deposit/index.js'
import { createEventManager, EventManager } from '../event/index.js'
import { withModuleContext } from '../logger/index.js'
import {
  createMempoolManagerCore,
  createMempoolManagerBuilder,
  createMempoolManageUpdater,
} from '../mempool/index.js'
import { IssuedStateCapabilitiesMapping } from '../ocaps/bootstrap.js'
import { ProviderService } from '../provider/index.js'
import { createReputationManager } from '../reputation/index.js'
import {
  MempoolManagerCore,
  ReputationManager,
  StateService,
  TranseptorLogger,
  Capability,
  CapabilityTypes,
  AuditLogger,
} from '../types/index.js'
import { ValidationService } from '../validation/index.js'

export type Managers = {
  reputationManager: ReputationManager
  mempoolManagerCore: MempoolManagerCore
  eventsManager: EventManager
  bundleManager: BundleManager
}

export type ManagersConfig = {
  logger: TranseptorLogger
  auditLogger: AuditLogger
  providerService: ProviderService
  validationService: ValidationService
  stateService: StateService
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
  issuedCapabilitiesMapping: IssuedStateCapabilitiesMapping
  chainId: number
}

export const createManagers = async (config: ManagersConfig) => {
  const {
    logger,
    auditLogger,
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
    issuedCapabilitiesMapping,
    chainId,
  } = config
  const extractStateCapability = (
    moduleName: string,
  ): Capability<CapabilityTypes.State> => {
    const capability = issuedCapabilitiesMapping[moduleName]
    if (!capability) {
      throw new Error(`Capability for module ${moduleName} not found`)
    }
    return capability
  }
  logger.info('Initializing managers')

  const reputationManager = createReputationManager({
    logger: withModuleContext('reputation-manager', logger),
    providerService,
    stateService,
    minStake,
    minUnstakeDelay,
    stateCapability: extractStateCapability('reputation-manager'),
  })

  await reputationManager.addWhitelist(whitelist)
  await reputationManager.addBlacklist(blacklist)
  reputationManager.startHourlyCron()

  const depositManager = createDepositManager({
    providerService,
    stateService,
    stateCapability: extractStateCapability('deposit-manager'),
  })

  const mempoolManagerCore = createMempoolManagerCore({
    logger: withModuleContext('mempool-manager-core', logger),
    state: stateService,
    reputationManager,
    depositManager,
    bundleSize,
    stateCapability: extractStateCapability('mempool-manager'),
  })

  const eventsManager = createEventManager({
    logger: withModuleContext('events-manager', logger),
    providerService,
    reputationManager,
    mempoolManageUpdater: createMempoolManageUpdater(mempoolManagerCore),
  })

  const bundleManager = createBundleManager({
    logger: withModuleContext('bundle-manager', logger),
    eventsManager,
    stateService,
    stateCapability: extractStateCapability('bundle-manager'),
    isAutoBundle,
    autoBundleInterval,
    bundleProcessor: createBundleProcessor({
      logUserOpLifecycleEvent:
        auditLogger.logUserOpLifecycleEvent.bind(auditLogger),
      logger: withModuleContext('bundle-processor', logger),
      providerService,
      reputationManager,
      mempoolManagerBuilder: createMempoolManagerBuilder(mempoolManagerCore),
      txMode,
      beneficiary,
      minSignerBalance,
      chainId,
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
  })

  return {
    reputationManager,
    mempoolManagerCore,
    eventsManager,
    bundleManager,
  }
}
