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

type RemoveUserOpDetails = {
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

  return {
    createBundle: async (
      entries: MempoolEntry[],
      knownSenders: string[],
    ): Promise<BundleReadyToSend> => {
      Logger.info(
        { total: entries.length },
        'Attempting to create bundle from entries',
      )

      const isThrottled = (
        status: ReputationStatus,
        entity: string | null,
        stakedEntityCount: { [addr: string]: number },
      ) =>
        status === ReputationStatus.THROTTLED &&
        (stakedEntityCount[entity ?? ''] ?? 0) >= THROTTLED_ENTITY_BUNDLE_COUNT

      const isBanned = (status: ReputationStatus) =>
        status === ReputationStatus.BANNED

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

          // Remove UserOps from mempool if paymaster or deployer is banned
          if (isBanned(paymasterStatus) || isBanned(factoryStatus)) {
            acc.markedToRemoveUserOpsHashes.push({
              userOpHash: userOpHash,
              paymaster: userOp.paymaster,
            })
            return acc
          }

          // [SREP-030]
          if (
            (paymaster &&
              isThrottled(paymasterStatus, paymaster, acc.stakedEntityCount)) ||
            (factory &&
              isThrottled(factoryStatus, factory, acc.stakedEntityCount))
          ) {
            Logger.debug(
              { sender: userOp.sender, nonce: userOp.nonce },
              'skipping throttled paymaster or factory',
            )
            acc.notIncludedUserOpsHashes.push(userOpHash)
            return acc
          }

          // allow only a single UserOp per sender per bundle
          if (acc.senders.has(userOp.sender)) {
            Logger.debug(
              { sender: userOp.sender, nonce: userOp.nonce },
              'skipping already included sender(duplicate sender)',
            )
            acc.notIncludedUserOpsHashes.push(userOpHash)
            return acc
          }

          //  re-validate UserOp and remove from mempool if failed. no need to check stake, since it cannot be reduced between first and 2nd validation
          const reValidateRes = await validationService
            .validateUserOp(userOp, false, referencedContracts)
            .catch((e: any) =>
              Either.Left<RpcError, ValidateUserOpResult>(
                new RpcError(
                  e.message ?? 'unknown error message',
                  e.code ?? ValidationErrors.InternalError,
                  e.data,
                ),
              ),
            )

          const validationResult: ValidateUserOpResult | null =
            reValidateRes.fold(
              (e) => {
                Logger.error(
                  { error: e.message, entry: entry },
                  'failed 2nd validation, removing from mempool:',
                )
                acc.markedToRemoveUserOpsHashes.push({
                  err: {
                    message: e.message,
                    errorCode: e.code,
                  },
                  userOpHash: userOpHash,
                  paymaster,
                })
                return null
              },
              (res) => res,
            )
          if (validationResult === null) {
            return acc
          }

          // [STO-041] Check if the UserOp accesses a storage of another known sender and ban the sender if so
          const accessesOtherSenders = Object.keys(
            validationResult.storageMap,
          ).some(
            (addr) =>
              addr.toLowerCase() !== sender.toLowerCase() &&
              knownSenders.includes(addr.toLowerCase()),
          )

          if (accessesOtherSenders) {
            Logger.debug(
              `UserOperation from ${sender} sender accessed a storage of another known sender in the bundle.`,
            )
            acc.notIncludedUserOpsHashes.push(userOpHash)
            return acc
          }

          // TODO: we could "cram" more UserOps into a bundle.
          // Calculate gas cost and ensure it fits
          const userOpGasCost =
            BigInt(validationResult.returnInfo.preOpGas) +
            BigInt(userOp.callGasLimit)
          const newTotalGas = acc.totalGas + userOpGasCost
          if (newTotalGas > BigInt(opts.maxBundleGas)) {
            acc.notIncludedUserOpsHashes.push(userOpHash)
            return acc
          }

          // get paymaster deposit and stakedEntityCount
          // Update staked entity counts and deposits
          if (paymaster) {
            if (!acc.paymasterDeposit[paymaster]) {
              acc.paymasterDeposit[paymaster] =
                await opts.entryPointContract.balanceOf(paymaster)
            }
            if (
              acc.paymasterDeposit[paymaster] <
              BigInt(validationResult.returnInfo.prefund)
            ) {
              acc.notIncludedUserOpsHashes.push(userOpHash)
              return acc
            }
            acc.paymasterDeposit[paymaster] -= BigInt(
              validationResult.returnInfo.prefund,
            )
            acc.stakedEntityCount = incrementCount(
              acc.stakedEntityCount,
              paymaster,
            )
          }

          if (factory) {
            acc.stakedEntityCount = incrementCount(
              acc.stakedEntityCount,
              factory,
            )
          }

          // add UserOp to bundle
          Logger.debug(
            { sender: userOp.sender, nonce: userOp.nonce },
            'adding to bundle',
          )
          mergeStorageMap(acc.storageMap, validationResult.storageMap)
          acc.bundle.push(userOp)
          acc.totalGas = newTotalGas
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
