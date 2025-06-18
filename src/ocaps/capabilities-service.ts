import { ethers } from 'ethers'
import {
  BaseCapability,
  CapabilitiesIssuer,
  CapabilitiesService,
  CapabilitiesServiceConfig,
  CapabilitiesVerifier,
  Capability,
  CapabilityRequest,
  CapabilityTypes,
  StateCapability,
  StateKey,
  StateOperations,
} from '../types/index.js'
import { withReadonly } from '../utils/index.js'

/**
 * Creates a new CapabilitiesIssuer instance
 *
 * @param capabilitiesService - The CapabilitiesService instance
 * @returns A new CapabilitiesIssuer instance
 */
function _createCapabilitiesIssuer(
  capabilitiesService: Readonly<CapabilitiesService>,
): CapabilitiesIssuer {
  return {
    issueStateCapability: capabilitiesService.issueStateCapability,
  }
}

export const createCapabilitiesIssuer = withReadonly<
  CapabilitiesService,
  CapabilitiesIssuer
>(_createCapabilitiesIssuer)

/**
 * Creates a new CapabilitiesVerifier instance
 *
 * @param capabilitiesService - The CapabilitiesService instance
 * @returns A new CapabilitiesVerifier instance
 */
function _createCapabilitiesVerifier(
  capabilitiesService: Readonly<CapabilitiesService>,
): CapabilitiesVerifier {
  return {
    verifyStateCapability: capabilitiesService.verifyStateCapability,
  }
}

export const createCapabilitiesVerifier = withReadonly<
  CapabilitiesService,
  CapabilitiesVerifier
>(_createCapabilitiesVerifier)

/**
 * Creates a new CapabilitiesService instance
 *
 * @param config - The configuration for the CapabilitiesService
 * @returns A new CapabilitiesService instance
 */
function _createCapabilitiesService(
  config: Readonly<CapabilitiesServiceConfig>,
): CapabilitiesService {
  const { logger, issuerSignerPrivateKey, clientVersion } = config
  const issuerWallet = new ethers.Wallet(issuerSignerPrivateKey)

  const recipientStateKeyMapping: Record<string, StateCapability[]> = {
    'reputation-manager': [
      {
        type: CapabilityTypes.State,
        data: {
          key: StateKey.ReputationEntries,
          operations: [StateOperations.READ, StateOperations.WRITE],
        },
      },
      {
        type: CapabilityTypes.State,
        data: {
          key: StateKey.WhiteList,
          operations: [StateOperations.READ, StateOperations.WRITE],
        },
      },
      {
        type: CapabilityTypes.State,
        data: {
          key: StateKey.BlackList,
          operations: [StateOperations.READ, StateOperations.WRITE],
        },
      },
    ],
  }
  const baseStateCapability: BaseCapability<CapabilityTypes.State> = {
    issuer: issuerWallet.address,
    clientVersion: clientVersion,
  }

  return {
    issueStateCapability: async (
      capabilityRequest: CapabilityRequest<CapabilityTypes.State>,
    ) => {
      logger.debug(
        {
          capabilityRequest,
        },
        'Attempting to issue capability',
      )
      const recipientAccess =
        recipientStateKeyMapping[capabilityRequest.moduleName]
      if (!recipientAccess) {
        throw new Error(
          `No access to state key for module ${capabilityRequest.moduleName}`,
        )
      }

      // TODO: Implement capability registration
      const capToIssue = {
        ...baseStateCapability,
        ...capabilityRequest,
        signature: '0x0000000000000000000000000000000000000000',
        caps: capabilityRequest.caps,
      }

      return capToIssue
    },
    verifyStateCapability: async (
      capability: Capability<CapabilityTypes.State>,
    ) => {
      logger.debug(
        {
          capability,
        },
        'Attempting to verify capability',
      )
      // TODO: Implement capability verification
      return true
    },
  }
}

export const createCapabilitiesService = withReadonly<
  CapabilitiesServiceConfig,
  CapabilitiesService
>(_createCapabilitiesService)
