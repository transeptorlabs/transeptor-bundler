import {
  createPreVerificationGasCalculator,
  PreVerificationGasCalculator,
} from '../gas/index.js'
import { withModuleContext } from '../logger/index.js'
import {
  StateCapabilityRegistry,
  createStateCapabilitiesBootstrap,
  createCapabilityIssuer,
  createCapabilityService,
  createCapabilityVerifier,
  IssuedStateCapabilitiesMapping,
} from '../ocaps/index.js'
import { ProviderService } from '../provider/index.js'
import { createErc7562Parser, createSimulator } from '../sim/index.js'
import { createState } from '../state/index.js'
import {
  BundlerSignerWallets,
  CapabilityService,
  Simulator,
  StateService,
  TranseptorLogger,
} from '../types/index.js'
import {
  createValidationService,
  ValidationService,
} from '../validation/index.js'

export type CoreServices = {
  preVerificationGasCalculator: PreVerificationGasCalculator
  sim: Simulator
  validationService: ValidationService
  stateService: StateService
  capabilityService: CapabilityService
  bootstrapStateCapabilities: () => Promise<IssuedStateCapabilitiesMapping>
}

export type CoreServicesConfig = {
  logger: TranseptorLogger
  isUnsafeMode: boolean
  entryPointAddress: string
  providerService: ProviderService
  chainId: number
  signers: BundlerSignerWallets
  clientVersion: string
  STATE_CAPABILITY_REGISTRY: StateCapabilityRegistry
}

export const createCoreServices = async (config: CoreServicesConfig) => {
  const {
    logger,
    isUnsafeMode,
    entryPointAddress,
    providerService,
    chainId,
    signers,
    clientVersion,
    STATE_CAPABILITY_REGISTRY,
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

  const capabilityService = createCapabilityService({
    logger: withModuleContext('capability-service', logger),
    issuerSignerPrivateKey: signers[1].privateKey,
    clientVersion,
  })

  const stateService = createState({
    logger: withModuleContext('state-service', logger),
    capabilityVerifier: createCapabilityVerifier(capabilityService),
  })

  const bootstrapStateCapabilities = createStateCapabilitiesBootstrap({
    capabilityIssuer: createCapabilityIssuer(capabilityService),
    stateCapabilityRegistry: STATE_CAPABILITY_REGISTRY,
  })

  return {
    preVerificationGasCalculator,
    sim,
    validationService,
    stateService,
    capabilityService,
    bootstrapStateCapabilities,
  }
}
