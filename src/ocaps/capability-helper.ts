import { AbiCoder, hexlify, keccak256, randomBytes } from 'ethers'

import {
  Capability,
  CapabilityTypes,
  StateOperations,
} from '../types/ocaps.types.js'

/**
 * Returns a 0x‑prefixed hex string of `byteLength` random bytes.
 *
 * @param byteLength – number of random bytes to generate (defaults to 32)
 * @returns A 0x‑prefixed hex string of `byteLength` random bytes.
 */
export function randomSalt(byteLength = 32): string {
  return hexlify(randomBytes(byteLength))
}

/**
 * Sorts the state operations alphabetically
 *
 * @param operations - The operations to sort
 * @returns The sorted operations
 */
export function sortedStateOperations(
  operations: StateOperations[],
): StateOperations[] {
  return [...operations].sort((a, b) => a.localeCompare(b))
}

/**
 * Encodes a state capability into a string
 *
 * @param capability - The capability to encode
 * @returns The encoded capability
 */
export function encodeStateCapability(
  capability: Capability<CapabilityTypes.State>,
) {
  const abiCoder = AbiCoder.defaultAbiCoder()
  const { issuer, clientVersion, moduleName, salt, ocaps } = capability
  const operations = ocaps.map((cap) => ({
    key: cap.data.key,
    operations: sortedStateOperations(cap.data.operations),
  }))

  return abiCoder.encode(
    [
      'address',
      'string',
      'string',
      'string',
      'tuple(string key, string[] operations)[]',
    ],
    [issuer, clientVersion, moduleName, salt, operations],
  )
}

/**
 * Returns the hash of a state capability
 *
 * @param capability - The capability to hash
 * @returns The hash of the capability
 */
export function getStateCapabilityHash(
  capability: Capability<CapabilityTypes.State>,
) {
  return keccak256(encodeStateCapability(capability))
}
