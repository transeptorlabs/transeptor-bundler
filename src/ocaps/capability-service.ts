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
import { isValidAddress, withReadonly } from '../utils/index.js'

import { getStateCapabilityHash } from './capability-helper.js'

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
    'signature' | 'ocaps' | 'moduleName' | 'salt'
  > = {
    issuer: issuerWallet.address,
    clientVersion: clientVersion,
  }

  return {
    issueStateCapability: async (
      capabilityRequest: CapabilityRequest<CapabilityTypes.State>,
    ) => {
      const capToIssue: Capability<CapabilityTypes.State> = {
        ...baseStateCapability,
        ...capabilityRequest,
        signature: '0x',
      }

      const signature = await issuerWallet.signMessage(
        getStateCapabilityHash(capToIssue),
      )

      logger.debug(`Issuing capability for module ${capToIssue.moduleName}`)

      return {
        ...capToIssue,
        signature,
      }
    },
    verifyStateCapability: (
      capabilityToVerify: Capability<CapabilityTypes.State>,
    ) => {
      logger.debug(
        `Attempting to verify capability for module ${capabilityToVerify.moduleName}`,
      )

      if (capabilityToVerify.signature === '0x') {
        logger.warn(
          {
            capabilityToVerify,
          },
          'Capability verification failed: signature is empty',
        )
        return false
      }

      if (!isValidAddress(capabilityToVerify.issuer)) {
        logger.warn(
          {
            capabilityToVerify,
          },
          'Capability verification failed: issuer is not a valid address',
        )
        return false
      }

      let recoveredAddress: string
      try {
        recoveredAddress = ethers.verifyMessage(
          getStateCapabilityHash(capabilityToVerify),
          capabilityToVerify.signature,
        )
      } catch (error) {
        logger.warn(error, 'Capability verification failed: invalid signature')
        return false
      }

      if (
        recoveredAddress.toLowerCase() !== issuerWallet.address.toLowerCase()
      ) {
        logger.warn('Capability verification failed: address mismatch')
        return false
      }

      logger.debug(
        `Capability verified successfully for module ${capabilityToVerify.moduleName}`,
      )

      return true
    },
  }
}

export const createCapabilityService = withReadonly<
  CapabilityServiceConfig,
  CapabilityService
>(_createCapabilityService)
