import { ethers } from 'ethers'
import { Logger } from '../logger/index.js'
import {
  StorageMap,
  UserOperation,
  ReputationManager,
  ReputationStatus,
  MempoolEntry,
  ValidateUserOpResult,
  ValidationErrors,
  RpcError,
  ReferencedCodeHashes,
} from '../types/index.js'
import { mergeStorageMap } from '../utils/index.js'
import { ValidationService } from '../validation/index.js'
import { Either } from '../monad/index.js'

export type BundleBuilder = {
  createBundle: (
    entries: MempoolEntry[],
    knownSenders: string[],
  ) => Promise<BundleReadyToSend>
}

export type RemoveUserOpDetails = {
  paymaster: string | undefined
  userOpHash: string
  err?: {
    message: string
    errorCode: ValidationErrors
  }
}

export type BundleReadyToSend = {
  bundle: UserOperation[]
  storageMap: StorageMap
  notIncludedUserOpsHashes: string[]
  markedToRemoveUserOpsHashes: RemoveUserOpDetails[]
}

export const createBundleBuilder = (
  validationService: ValidationService,
  reputationManager: ReputationManager,
  opts: {
    maxBundleGas: number
    txMode: string
    entryPointContract: ethers.Contract
  },
): BundleBuilder => {
  const THROTTLED_ENTITY_BUNDLE_COUNT = 4

  // Helper to update staked entity counts
  const incrementCount = (counts: Record<string, number>, key: string) => ({
    ...counts,
    [key]: (counts[key] || 0) + 1,
  })

  // Helper to validate a user operation
  const validateUserOperation = async (
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

  // Helper to check if a user operation should be included in the bundle
  const shouldIncludeInBundle = (
    userOp: UserOperation,
    userOpHash: string,
    paymasterStatus: ReputationStatus,
    factoryStatus: ReputationStatus,
    acc: any,
    knownSenders: string[],
    validationResult: ValidateUserOpResult,
  ): { include: boolean; reason?: string } => {
    const { sender, paymaster, factory } = userOp

    // Check if paymaster or factory is banned
    if (
      paymasterStatus === ReputationStatus.BANNED ||
      factoryStatus === ReputationStatus.BANNED
    ) {
      return { include: false, reason: 'banned' }
    }

    // Check throttling
    if (
      isEntityThrottled(paymaster, paymasterStatus, acc) ||
      isEntityThrottled(factory, factoryStatus, acc)
    ) {
      return { include: false, reason: 'throttled' }
    }

    // Check duplicate sender
    if (acc.senders.has(sender)) {
      return { include: false, reason: 'duplicate_sender' }
    }

    // Check storage access
    if (accessesOtherSendersStorage(validationResult, sender, knownSenders)) {
      return { include: false, reason: 'storage_access' }
    }

    // Check gas limit
    if (exceedsGasLimit(validationResult, userOp, acc, opts.maxBundleGas)) {
      return { include: false, reason: 'gas_limit' }
    }

    // Check paymaster deposit
    if (paymaster && hasInsufficientDeposit(paymaster, validationResult, acc)) {
      return { include: false, reason: 'insufficient_deposit' }
    }

    return { include: true }
  }

  // Helper to check if an entity is throttled
  const isEntityThrottled = (
    entity: string | null,
    status: ReputationStatus,
    acc: any,
  ): boolean => {
    if (!entity) return false

    return (
      status === ReputationStatus.THROTTLED &&
      (acc.stakedEntityCount[entity] ?? 0) >= THROTTLED_ENTITY_BUNDLE_COUNT
    )
  }

  // Helper to check if a user operation accesses storage of another sender
  const accessesOtherSendersStorage = (
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

  // Helper to check if a user operation exceeds gas limit
  const exceedsGasLimit = (
    validationResult: ValidateUserOpResult,
    userOp: UserOperation,
    acc: any,
    maxBundleGas: number,
  ): boolean => {
    const userOpGasCost =
      BigInt(validationResult.returnInfo.preOpGas) + BigInt(userOp.callGasLimit)
    const newTotalGas = acc.totalGas + userOpGasCost
    return newTotalGas > BigInt(maxBundleGas)
  }

  // Helper to check if a paymaster has insufficient deposit
  const hasInsufficientDeposit = (
    paymaster: string,
    validationResult: ValidateUserOpResult,
    acc: any,
  ): boolean => {
    return (
      acc.paymasterDeposit[paymaster] <
      BigInt(validationResult.returnInfo.prefund)
    )
  }

  // Helper to process paymaster and factory
  const processEntities = async (
    userOp: UserOperation,
    validationResult: ValidateUserOpResult,
    acc: any,
  ): Promise<void> => {
    const { paymaster, factory } = userOp

    if (paymaster) {
      if (!acc.paymasterDeposit[paymaster]) {
        acc.paymasterDeposit[paymaster] =
          await opts.entryPointContract.balanceOf(paymaster)
      }
      acc.paymasterDeposit[paymaster] -= BigInt(
        validationResult.returnInfo.prefund,
      )
      acc.stakedEntityCount = incrementCount(acc.stakedEntityCount, paymaster)
    }

    if (factory) {
      acc.stakedEntityCount = incrementCount(acc.stakedEntityCount, factory)
    }
  }

  return {
    createBundle: async (
      entries: MempoolEntry[],
      knownSenders: string[],
    ): Promise<BundleReadyToSend> => {
      Logger.info(
        { total: entries.length },
        'Attempting to create bundle from entries',
      )

      const {
        bundle,
        storageMap,
        notIncludedUserOpsHashes,
        markedToRemoveUserOpsHashes,
      } = await entries.reduce(
        async (accPromise, entry) => {
          const acc = await accPromise
          const { userOp, userOpHash, referencedContracts } = entry
          const { sender, paymaster, factory } = userOp

          const [paymasterStatus, factoryStatus] = await Promise.all([
            reputationManager.getStatus(paymaster),
            reputationManager.getStatus(factory),
          ])

          // Validate user operation
          const { validationResult, passedValidation, reValidateErrorMessage } =
            await validateUserOperation(
              userOp,
              referencedContracts,
              validationService,
            )

          if (validationResult === null || !passedValidation) {
            Logger.error(
              { error: reValidateErrorMessage, userOp },
              'failed 2nd validation, removing from mempool:',
            )
            acc.markedToRemoveUserOpsHashes.push({
              userOpHash: userOpHash,
              paymaster,
              err: {
                message: reValidateErrorMessage,
                errorCode: ValidationErrors.InternalError,
              },
            })
            return acc
          }

          // Check if user operation should be included
          const { include, reason } = shouldIncludeInBundle(
            userOp,
            userOpHash,
            paymasterStatus,
            factoryStatus,
            acc,
            knownSenders,
            validationResult,
          )

          if (!include) {
            if (reason === 'banned') {
              acc.markedToRemoveUserOpsHashes.push({
                userOpHash: userOpHash,
                paymaster: userOp.paymaster,
              })
            } else {
              Logger.debug(
                { sender: userOp.sender, nonce: userOp.nonce, reason },
                'skipping user operation',
              )
              acc.notIncludedUserOpsHashes.push(userOpHash)
            }
            return acc
          }

          // Process entities and add to bundle
          await processEntities(userOp, validationResult, acc)

          // Add UserOp to bundle
          Logger.debug(
            { sender: userOp.sender, nonce: userOp.nonce },
            'adding to bundle',
          )
          mergeStorageMap(acc.storageMap, validationResult.storageMap)
          acc.bundle.push(userOp)
          acc.totalGas +=
            BigInt(validationResult.returnInfo.preOpGas) +
            BigInt(userOp.callGasLimit)
          acc.senders.add(sender)

          return acc
        },
        Promise.resolve({
          bundle: [] as UserOperation[],
          storageMap: {} as StorageMap,
          notIncludedUserOpsHashes: [] as string[],
          markedToRemoveUserOpsHashes: [] as RemoveUserOpDetails[],
          totalGas: BigInt(0),
          paymasterDeposit: {} as { [paymaster: string]: bigint }, // paymaster deposit should be enough for all UserOps in the bundle
          senders: new Set<string>(), // each sender is allowed only once per bundle
          stakedEntityCount: {} as { [addr: string]: number }, // throttled paymasters and deployers are allowed only small UserOps per bundle
        }),
      )

      return {
        bundle,
        storageMap,
        notIncludedUserOpsHashes,
        markedToRemoveUserOpsHashes,
      }
    },
  }
}
