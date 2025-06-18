import {
  createValidationService,
  ValidationService,
} from '../validation/index.js'
import {
  createPreVerificationGasCalculator,
  PreVerificationGasCalculator,
} from '../gas/index.js'
import { createErc7562Parser, createSimulator } from '../sim/index.js'
import {
  CapabilitiesService,
  Simulator,
  StateService,
  TranseptorLogger,
} from '../types/index.js'
import { withModuleContext } from '../logger/index.js'
import { createState } from '../state/index.js'
import { ProviderService } from '../provider/index.js'
import { createCapabilitiesService } from '../ocaps/index.js'

export type CoreServices = {
  preVerificationGasCalculator: PreVerificationGasCalculator
  sim: Simulator
  validationService: ValidationService
  stateService: StateService
  capabilitiesService: CapabilitiesService
}

export type CoreServicesConfig = {
  logger: TranseptorLogger
  isUnsafeMode: boolean
  entryPointAddress: string
  providerService: ProviderService
  chainId: number
  ocapsIssuerSignerPrivateKey: string
  clientVersion: string
}

export const createCoreServices = async (config: CoreServicesConfig) => {
  const {
    logger,
    isUnsafeMode,
    entryPointAddress,
    providerService,
    chainId,
    ocapsIssuerSignerPrivateKey,
    clientVersion,
  } = config
  logger.info('Initializing core services')

  const preVerificationGasCalculator =
    createPreVerificationGasCalculator(chainId)

  const sim = createSimulator({
    providerService,
    preVerificationGasCalculator,
    logger: withModuleContext('simulator', logger),
  })

  const validationService = createValidationService({
    logger: withModuleContext('validation', logger),
    providerService,
    sim,
    preVerificationGasCalculator,
    isUnsafeMode,
    erc7562Parser: createErc7562Parser({
      entryPointAddress,
      logger: withModuleContext('erc7562-parser', logger),
    }),
  })

  const stateService = createState({
    logger: withModuleContext('state', logger),
  })

  const capabilitiesService = createCapabilitiesService({
    logger: withModuleContext('capabilities-manager', logger),
    issuerSignerPrivateKey: ocapsIssuerSignerPrivateKey,
    clientVersion,
  })

  return {
    preVerificationGasCalculator,
    sim,
    validationService,
    stateService,
    capabilitiesService,
  }
}
