import { Either } from '../../monad/either.js'
import {
  ReferencedCodeHashes,
  ReputationStatus,
  RpcError,
  UserOperation,
  ValidateUserOpResult,
  ValidationErrors,
} from '../../types/index.js'
import { ValidationService } from '../../validation/index.js'

/**
 * Increment the count of a given key in the counts object.
 *
 * @param counts - The object containing the counts.
 * @param key - The key to increment.
 * @returns The updated counts object.
 */
export const incrementCount = (
  counts: Record<string, number>,
  key: string,
) => ({
  ...counts,
  [key]: (counts[key] || 0) + 1,
})

/**
 * Validate a user operation.
 *
 * @param userOp - The user operation to validate.
 * @param referencedContracts - The referenced contracts.
 * @param validationService - The validation service.
 * @returns The validation result.
 */
export const validateUserOperation = async (
  userOp: UserOperation,
  referencedContracts: ReferencedCodeHashes,
  validationService: ValidationService,
): Promise<{
  passedValidation: boolean
  validationResult: ValidateUserOpResult | null
  reValidateErrorMessage: string | undefined
}> => {
  const reValidateRes = await validationService
    .validateUserOp(userOp, false, referencedContracts)
    .catch((e: any) =>
      Either.Left<RpcError, ValidateUserOpResult>(
        new RpcError(
          e.message ??
            'unknown error message when validating user operation(building bundle)',
          e.code ?? ValidationErrors.InternalError,
          e.data,
        ),
      ),
    )

  const res = reValidateRes.fold(
    (e) => ({
      passedValidation: false,
      validationResult: null,
      reValidateErrorMessage: e.message,
    }),
    (res) => ({
      passedValidation: true,
      validationResult: res,
      reValidateErrorMessage: undefined,
    }),
  )
  return res
}

/**
 * Check if an entity is throttled.
 *
 * @param entity - The entity to check.
 * @param status - The status of the entity.
 * @param stakedEntityCount - The staked entity count.
 * @param throttledEntityBundleCount - The throttled entity bundle count.
 * @returns True if the entity is throttled, false otherwise.
 */
export const isEntityThrottled = (
  entity: string | null,
  status: ReputationStatus,
  stakedEntityCount: { [addr: string]: number },
  throttledEntityBundleCount: number,
): boolean => {
  if (!entity) return false

  return (
    status === ReputationStatus.THROTTLED &&
    (stakedEntityCount[entity] ?? 0) >= throttledEntityBundleCount
  )
}

/**
 * Check if a user operation should be included in the bundle.
 *
 * @param opt - The options.
 * @param opt.userOp - The user operation to check.
 * @param opt.paymasterStatus - The status of the paymaster.
 * @param opt.factoryStatus - The status of the factory.
 * @param opt.validationResult - The validation result.
 * @param opt.stakedEntityCount - The staked entity count.
 * @param opt.paymasterDeposit - The paymaster deposit.
 * @param opt.throttledEntityBundleCount - The throttled entity bundle count.
 * @param opt.totalGas - The total gas.
 * @param opt.maxBundleGas - The max bundle gas.
 * @param opt.knownSenders - The known senders.
 * @param opt.senders - The senders.
 * @returns True if the user operation should be included in the bundle, false otherwise.
 */
export const shouldIncludeInBundle = (opt: {
  userOp: UserOperation
  paymasterStatus: ReputationStatus
  factoryStatus: ReputationStatus
  validationResult: ValidateUserOpResult
  stakedEntityCount: { [addr: string]: number }
  paymasterDeposit: { [paymaster: string]: bigint }
  throttledEntityBundleCount: number
  totalGas: bigint
  maxBundleGas: number
  knownSenders: string[]
  senders: Set<string>
}): { include: boolean; reason?: string } => {
  const {
    userOp,
    paymasterStatus,
    factoryStatus,
    validationResult,
    stakedEntityCount,
    paymasterDeposit,
    throttledEntityBundleCount,
    totalGas,
    maxBundleGas,
    knownSenders,
    senders,
  } = opt
  const { sender, paymaster, factory } = userOp

  // Check if paymaster or factory is banned
  // Remove UserOps from mempool if paymaster or deployer is banned
  if (
    paymasterStatus === ReputationStatus.BANNED ||
    factoryStatus === ReputationStatus.BANNED
  ) {
    return { include: false, reason: 'banned' }
  }

  // [SREP-030] - Check throttling
  if (
    isEntityThrottled(
      paymaster,
      paymasterStatus,
      stakedEntityCount,
      throttledEntityBundleCount,
    ) ||
    isEntityThrottled(
      factory,
      factoryStatus,
      stakedEntityCount,
      throttledEntityBundleCount,
    )
  ) {
    return { include: false, reason: 'throttled' }
  }

  // Check duplicate sender. Allow only a single UserOp per sender per bundle
  if (senders.has(sender)) {
    return { include: false, reason: 'duplicate_sender' }
  }

  // [STO-041] Check if the UserOp accesses a storage of another known sender and ban the sender if so
  if (accessesOtherSendersStorage(validationResult, sender, knownSenders)) {
    return { include: false, reason: 'access_other_sender_storage' }
  }

  // Check gas limit to ensure the userOp will fit in the bundle
  if (exceedBundleGasLimit(validationResult, userOp, totalGas, maxBundleGas)) {
    return { include: false, reason: 'exceeds_bundler_gas_limit' }
  }

  // Check paymaster deposit
  if (paymaster) {
    if (
      paymasterHasInsufficientDeposit(
        paymaster,
        validationResult,
        paymasterDeposit,
      )
    ) {
      return { include: false, reason: 'paymaster_insufficient_deposit' }
    }
  }

  return { include: true }
}

/**
 * Check if a user operation accesses storage of another sender.
 *
 * @param validationResult - The validation result.
 * @param sender - The sender.
 * @param knownSenders - The known senders.
 * @returns True if the user operation accesses storage of another sender, false otherwise.
 */
export const accessesOtherSendersStorage = (
  validationResult: ValidateUserOpResult,
  sender: string,
  knownSenders: string[],
): boolean => {
  return Object.keys(validationResult.storageMap).some(
    (addr) =>
      addr.toLowerCase() !== sender.toLowerCase() &&
      knownSenders.includes(addr.toLowerCase()),
  )
}

/**
 * Check if a user operation exceeds the bundle gas limit.
 *
 * @param validationResult - The validation result.
 * @param userOp - The user operation.
 * @param totalGas - The total gas.
 * @param maxBundleGas - The max bundle gas.
 * @returns True if the user operation exceeds the bundle gas limit, false otherwise.
 */
export const exceedBundleGasLimit = (
  validationResult: ValidateUserOpResult,
  userOp: UserOperation,
  totalGas: bigint,
  maxBundleGas: number,
): boolean => {
  const userOpGasCost =
    BigInt(validationResult.returnInfo.preOpGas) + BigInt(userOp.callGasLimit)
  const newTotalGas = totalGas + userOpGasCost
  return newTotalGas > BigInt(maxBundleGas)
}

/**
 * Check if a paymaster has insufficient deposit.
 *
 * @param paymaster - The paymaster.
 * @param validationResult - The validation result.
 * @param paymasterDeposit - The paymaster deposit.
 * @returns True if the paymaster has insufficient deposit, false otherwise.
 */
export const paymasterHasInsufficientDeposit = (
  paymaster: string,
  validationResult: ValidateUserOpResult,
  paymasterDeposit: { [paymaster: string]: bigint },
): boolean => {
  return (
    paymasterDeposit[paymaster] < BigInt(validationResult.returnInfo.prefund)
  )
}

/**
 * Update the staked entity count and paymaster deposit.
 *
 * @param opts - The options.
 * @param opts.userOp - The user operation.
 * @param opts.validationResult - The validation result.
 * @param opts.stakedEntityCount - The staked entity count.
 * @param opts.paymasterDeposit - The paymaster deposit.
 * @returns The updated staked entity count and paymaster deposit.
 */
export const updateEntityStakeCountAndDeposit = async (opts: {
  userOp: UserOperation
  validationResult: ValidateUserOpResult
  stakedEntityCount: { [addr: string]: number }
  paymasterDeposit: { [paymaster: string]: bigint }
}): Promise<{
  stakedEntityCount: { [addr: string]: number }
  paymasterDeposit: { [paymaster: string]: bigint }
}> => {
  const { userOp, validationResult, stakedEntityCount, paymasterDeposit } = opts
  const { paymaster, factory } = userOp
  let newStakedEntityCount = { ...stakedEntityCount }
  const newPaymasterDeposit = { ...paymasterDeposit }

  if (paymaster) {
    newPaymasterDeposit[paymaster] -= BigInt(
      validationResult.returnInfo.prefund,
    )
    newStakedEntityCount = incrementCount(stakedEntityCount, paymaster)
  }

  if (factory) {
    newStakedEntityCount = incrementCount(stakedEntityCount, factory)
  }

  return {
    stakedEntityCount: newStakedEntityCount,
    paymasterDeposit: newPaymasterDeposit,
  }
}
