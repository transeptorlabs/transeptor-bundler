import {
  CapabilityRequest,
  CapabilityTypes,
  Capability,
  CapabilityIssuer,
} from '../types/index.js'
import { StateCapabilityRegistry } from './capability-registry.js'

export type StateCapabilitiesBootstrapConfig = {
  capabilityIssuer: CapabilityIssuer
  stateCapabilityRegistry: StateCapabilityRegistry
}

export type IssuedStateCapabilitiesMapping = Record<
  string,
  Capability<CapabilityTypes.State>
>

/**
 * Creates a function that, when called, issues state capabilities for all registered modules.
 *
 * @param config - The configuration for the capabilities bootstrapping
 * @returns A function that, when called, issues capabilities for all registered modules
 */
export function createStateCapabilitiesBootstrap(
  config: Readonly<StateCapabilitiesBootstrapConfig>,
): () => Promise<IssuedStateCapabilitiesMapping> {
  const { capabilityIssuer, stateCapabilityRegistry } = config

  const buildStateCapabilityRequests =
    (): CapabilityRequest<CapabilityTypes.State>[] =>
      Object.entries(stateCapabilityRegistry).map(
        ([moduleName, caps]) =>
          ({
            moduleName,
            caps,
          }) as CapabilityRequest<CapabilityTypes.State>,
      )

  return async () => {
    const requests = buildStateCapabilityRequests()

    const issued: Record<string, Capability<CapabilityTypes.State>> = {}

    for (const req of requests) {
      const cap = await capabilityIssuer.issueStateCapability(req)
      issued[req.moduleName] = cap
    }

    return issued
  }
}
