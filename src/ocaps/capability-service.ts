import { ethers } from 'ethers'
import {
  CapabilityIssuer,
  CapabilityService,
  CapabilityVerifier,
  Capability,
  CapabilityRequest,
  CapabilityTypes,
  TranseptorLogger,
} from '../types/index.js'
import { withReadonly } from '../utils/index.js'

export type CapabilityServiceConfig = {
  logger: TranseptorLogger
  issuerSignerPrivateKey: string
  clientVersion: string
}

/**
 * Creates a new CapabilityIssuer instance
 *
 * @param capabilityService - The CapabilityService instance
 * @returns A new CapabilityIssuer instance
 */
function _createCapabilityIssuer(
  capabilityService: Readonly<CapabilityService>,
): CapabilityIssuer {
  return {
    issueStateCapability: capabilityService.issueStateCapability,
  }
}

export const createCapabilityIssuer = withReadonly<
  CapabilityService,
  CapabilityIssuer
>(_createCapabilityIssuer)

/**
 * Creates a new CapabilityVerifier instance
 *
 * @param capabilityService - The CapabilityService instance
 * @returns A new CapabilityVerifier instance
 */
function _createCapabilityVerifier(
  capabilityService: Readonly<CapabilityService>,
): CapabilityVerifier {
  return {
    verifyStateCapability: capabilityService.verifyStateCapability,
  }
}

export const createCapabilityVerifier = withReadonly<
  CapabilityService,
  CapabilityVerifier
>(_createCapabilityVerifier)

/**
 * Creates a new CapabilityService instance
 *
 * @param config - The configuration for the CapabilityService
 * @returns A new CapabilityService instance
 */
function _createCapabilityService(
  config: Readonly<CapabilityServiceConfig>,
): CapabilityService {
  const { logger, issuerSignerPrivateKey, clientVersion } = config
  const issuerWallet = new ethers.Wallet(issuerSignerPrivateKey)

  const baseStateCapability: Omit<
    Capability<CapabilityTypes.State>,
    'signature' | 'caps' | 'moduleName' | 'salt'
  > = {
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
        'Issuing capability',
      )

      // TODO: Implement capability issuance
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

export const createCapabilityService = withReadonly<
  CapabilityServiceConfig,
  CapabilityService
>(_createCapabilityService)
