import { StateKey } from './state.types.js'

export enum CapabilityTypes {
  State = 'state',
}

export enum StateOperations {
  READ = 'read',
  WRITE = 'write',
}

export type StateCapability = {
  type: CapabilityTypes.State
  data: {
    key: StateKey
    operations: StateOperations[]
  }
}

export type CapabilityTypesMapping = {
  [CapabilityTypes.State]: StateCapability[]
}

/**
 * A Capability is a signed object that allows a specific module to access a specific part of the state.
 * It is used to enforce a capability-based access control mechanism using signed `Capability objects` that are registered for each module at startup.
 * This will restrict modules to updating only explicitly permitted parts of the state.
 */
export type Capability<TCapType extends CapabilityTypes> = {
  /**
   * The entity that issues the capability, this will be one of the bundler EOA signers
   */
  issuer: string

  /**
   * The bundler version that issues the capability
   */
  clientVersion: string

  /**
   * The name of the the TS module to receive the Capability
   */
  moduleName: string

  /**
   * List of capabilities that the recipient is allowed to have access to
   */
  caps: CapabilityTypesMapping[TCapType]

  /**
   * A salt that is used to ensure that the capability is unique
   */
  salt: string

  /**
   * signed hash of the capability, excluding the signature
   */
  signature: string
}

/**
 *
 * This is the request that is sent to the CapabilityService to request a capability
 */
export type CapabilityRequest<TCapType extends CapabilityTypes> = Omit<
  Capability<TCapType>,
  'signature' | 'issuer' | 'clientVersion'
>

export type CapabilityService = {
  /**
   * Issues a capability to the given recipient for the given state key
   *
   * @param request - The request to issue a capability for
   * @returns The issued capability
   */
  issueStateCapability: (
    request: CapabilityRequest<CapabilityTypes.State>,
  ) => Promise<Capability<CapabilityTypes.State>>

  /**
   * Verifies a capability for the given recipient for the given state key
   *
   * @param capability - The capability to verify
   * @returns True if the capability is valid, false otherwise
   */
  verifyStateCapability: (
    capability: Capability<CapabilityTypes.State>,
  ) => Promise<boolean>
}

export type CapabilityIssuer = Pick<CapabilityService, 'issueStateCapability'>

export type CapabilityVerifier = Pick<
  CapabilityService,
  'verifyStateCapability'
>
