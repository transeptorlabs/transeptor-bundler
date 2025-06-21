import { createEthAPI, createWeb3API, createDebugAPI } from '../apis/index.js'
import { BundleManager } from '../bundle/index.js'
import { EventManager } from '../event/index.js'
import { PreVerificationGasCalculator } from '../gas/index.js'
import { ProviderService } from '../provider/index.js'
import { createBundlerHandlerRegistry } from '../rpc/index.js'
import {
  AuditLogger,
  HandlerRegistry,
  MempoolManagerCore,
  MempoolManageSender,
  ReputationManager,
  Simulator,
  TranseptorLogger,
} from '../types/index.js'
import { ValidationService } from '../validation/index.js'

export type InternalAPIs = {
  handlerRegistry: HandlerRegistry
}

export type InternalAPIsConfig = {
  logger: TranseptorLogger
  auditLogger: AuditLogger
  providerService: ProviderService
  sim: Simulator
  validationService: ValidationService
  eventsManager: EventManager
  mempoolManageSender: MempoolManageSender
  preVerificationGasCalculator: PreVerificationGasCalculator
  bundleManager: BundleManager
  reputationManager: ReputationManager
  mempoolManagerCore: MempoolManagerCore
  eip7702Support: boolean
  clientVersion: string
  chainId: number
}

export const createInternalAPIs = (config: InternalAPIsConfig) => {
  const {
    logger,
    auditLogger,
    providerService,
    sim,
    validationService,
    eventsManager,
    mempoolManageSender,
    preVerificationGasCalculator,
    bundleManager,
    reputationManager,
    mempoolManagerCore,
    eip7702Support,
    clientVersion,
    chainId,
  } = config
  logger.info('Initializing internal APIs')

  const handlerRegistry = createBundlerHandlerRegistry({
    eth: createEthAPI({
      logUserOpLifecycleEvent:
        auditLogger.logUserOpLifecycleEvent.bind(auditLogger),
      providerService,
      sim,
      validationService,
      eventsManager,
      mempoolManageSender,
      preVerificationGasCalculator,
      eip7702Support,
      chainId,
    }),
    web3: createWeb3API(clientVersion),
    debug: createDebugAPI({
      providerService,
      bundleManager,
      reputationManager,
      mempoolManagerCore,
      eventsManager,
      preVerificationGasCalculator,
    }),
  })

  return {
    handlerRegistry,
  }
}
