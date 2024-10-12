import { BigNumber, BigNumberish, ethers } from 'ethers'
import { hexDataSlice, hexZeroPad } from 'ethers/lib/utils.js'

import { UserOperation } from '../types/index.js'
import { ValidationErrors } from '../validatation/index.js'

import { requireCond } from './rpc.utils.js'

export const maxUint48 = 2 ** 48 - 1
export const SIG_VALIDATION_FAILED = hexZeroPad('0x01', 20)

type ValidationData = {
  aggregator: string
  validAfter: number
  validUntil: number
}

/**
 * Require address and fields.
 *
 * @param userOp - The UserOperation to validate.
 * @param addrField - The address field.
 * @param mustFields - The fields that must be present.
 * @param optionalFields - The fields that are optional.
 */
export function requireAddressAndFields(
  userOp: UserOperation,
  addrField: string,
  mustFields: string[],
  optionalFields: string[] = [],
): void {
  const op = userOp as any
  const addr = op[addrField]
  if (addr == null) {
    const unexpected = Object.entries(op).filter(
      ([name, value]) =>
        value != null &&
        (mustFields.includes(name) || optionalFields.includes(name)),
    )
    requireCond(
      unexpected.length === 0,
      `no ${addrField} but got ${unexpected.join(',')}`,
      ValidationErrors.InvalidFields,
    )
  } else {
    requireCond(
      addr.match(/^0x[a-f0-9]{10,40}$/i),
      `invalid ${addrField}`,
      ValidationErrors.InvalidFields,
    )
    const missing = mustFields.filter((name) => op[name] == null)
    requireCond(
      missing.length === 0,
      `got ${addrField} but missing ${missing.join(',')}`,
      ValidationErrors.InvalidFields,
    )
  }
}

/**
 * Merge validation data.
 *
 * @param accountValidationData  - Account validation data.
 * @param paymasterValidationData - Paymaster validation data.
 * @returns Aggregator, validAfter, validUntil.
 */
export function mergeValidationData(
  accountValidationData: ValidationData,
  paymasterValidationData: ValidationData,
): ValidationData {
  return {
    aggregator:
      paymasterValidationData.aggregator !== ethers.constants.AddressZero
        ? SIG_VALIDATION_FAILED
        : accountValidationData.aggregator,
    validAfter: Math.max(
      accountValidationData.validAfter,
      paymasterValidationData.validAfter,
    ),
    validUntil: Math.min(
      accountValidationData.validUntil,
      paymasterValidationData.validUntil,
    ),
  }
}

/**
 * Parse validation data.
 *
 * @param validationData - Validation data.
 * @returns Aggregator, validAfter, validUntil.
 */
export function parseValidationData(
  validationData: BigNumberish,
): ValidationData {
  const data = hexZeroPad(BigNumber.from(validationData).toHexString(), 32)

  // string offsets start from left (msb)
  const aggregator = hexDataSlice(data, 32 - 20)
  let validUntil = parseInt(hexDataSlice(data, 32 - 26, 32 - 20))
  if (validUntil === 0) validUntil = maxUint48
  const validAfter = parseInt(hexDataSlice(data, 0, 6))

  return {
    aggregator,
    validAfter,
    validUntil,
  }
}

/**
 * Merge validation data values from account and paymaster.
 *
 * @param accountValidationData - Account validation data.
 * @param paymasterValidationData - Paymaster validation data.
 * @returns Aggregator, validAfter, validUntil.
 */
export function mergeValidationDataValues(
  accountValidationData: BigNumberish,
  paymasterValidationData: BigNumberish,
): ValidationData {
  return mergeValidationData(
    parseValidationData(accountValidationData),
    parseValidationData(paymasterValidationData),
  )
}
