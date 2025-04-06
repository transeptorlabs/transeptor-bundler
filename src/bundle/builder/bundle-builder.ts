import { ethers } from 'ethers'
import { Logger } from '../../logger/index.js'
import {
  StorageMap,
  UserOperation,
  ReputationManager,
  MempoolEntry,
  ValidationErrors,
  MempoolManagerBuilder,
  BundleBuilder,
  BundleBuilderResult,
  BundleReadyToSend,
  RemoveUserOpDetails,
} from '../../types/index.js'
import { isAccountOrFactoryError, mergeStorageMap } from '../../utils/index.js'
import { ValidationService } from '../../validation/index.js'
import {
  validateUserOperation,
  shouldIncludeInBundle,
  updateEntityStakeCountAndDeposit,
} from './builder-helpers.js'

export type BundleBuilderConfig = {
  validationService: ValidationService
  reputationManager: ReputationManager
  mempoolManagerBuilder: MempoolManagerBuilder
  opts: {
    maxBundleGas: number
    txMode: string
    entryPointContract: ethers.Contract
  }
}

export const createBundleBuilder = (
  config: BundleBuilderConfig,
): BundleBuilder => {
  const { validationService, reputationManager, mempoolManagerBuilder, opts } =
    config
  const THROTTLED_ENTITY_BUNDLE_COUNT = 4

  const getEntries = async (force?: boolean): Promise<MempoolEntry[]> => {
    if ((await mempoolManagerBuilder.size()) === 0) {
      return []
    }

    // if force is true, send the all pending UserOps in the mempool as a bundle
    const entries: MempoolEntry[] = force
      ? await mempoolManagerBuilder.getAllPending()
      : await mempoolManagerBuilder.getNextPending()

    return entries
  }

  const afterHook = async (
    notIncludedUserOpsHashes: string[],
    markedToRemoveUserOpsHashes: RemoveUserOpDetails[],
  ) => {
    Logger.debug('After hook running for bundle builder')
    if (notIncludedUserOpsHashes.length > 0) {
      Logger.debug(
        { total: notIncludedUserOpsHashes.length },
        'Sending userOps not included in built bundle back to mempool with status of pending',
      )
      for (const userOpHash of notIncludedUserOpsHashes) {
        await mempoolManagerBuilder.updateEntryStatus(userOpHash, 'pending')
      }
    }

    if (markedToRemoveUserOpsHashes.length > 0) {
      Logger.debug(
        { total: markedToRemoveUserOpsHashes.length },
        'Marked to remove: removing UserOps from mempool',
      )

      for (const opDetails of markedToRemoveUserOpsHashes) {
        /**
         * EREP-015: A `paymaster` should not have its opsSeen incremented on failure of factory or account
         * When running 2nd validation (before inclusion in a bundle), if a UserOperation fails because of factory or
         * account error (either a FailOp revert or validation rule), then the paymaster's opsSeen valid is decremented by 1.
         */
        if (opDetails.err) {
          if (
            opDetails.paymaster != null &&
            isAccountOrFactoryError(
              opDetails.err.errorCode,
              opDetails.err.message,
            )
          ) {
            Logger.debug(
              opDetails,
              'Do not blame paymaster, for account/factory failure',
            )
            await reputationManager.updateSeenStatus(
              opDetails.paymaster,
              'decrement',
            )
          }
        }
        await mempoolManagerBuilder.removeUserOp(opDetails.userOpHash)
      }
    }
  }

  return {
    createBundle: async (force?: boolean): Promise<BundleReadyToSend> => {
      Logger.info('Attempting to create bundle')
      const entries = await getEntries(force)
      const knownSenders = await mempoolManagerBuilder.getKnownSenders()
      if (entries.length === 0) {
        return {
          bundle: [],
          storageMap: {},
        }
      }

      const bundleBuilderResult: BundleBuilderResult = {
        bundle: [] as UserOperation[],
        storageMap: {} as StorageMap,
        notIncludedUserOpsHashes: [] as string[],
        markedToRemoveUserOpsHashes: [] as RemoveUserOpDetails[],
        totalGas: BigInt(0),
        paymasterDeposit: {} as { [paymaster: string]: bigint }, // paymaster deposit should be enough for all UserOps in the bundle
        senders: new Set<string>(), // each sender is allowed only once per bundle
        stakedEntityCount: {} as { [addr: string]: number }, // throttled paymasters and deployers are allowed only small UserOps per bundle
      }
      const buildBundle = async () =>
        await entries.reduce(async (accPromise, entry) => {
          const acc = await accPromise
          const { userOp, userOpHash, referencedContracts } = entry
          const { sender, paymaster, factory } = userOp
          if (paymaster) {
            if (!acc.paymasterDeposit[paymaster]) {
              Logger.debug(
                { paymaster },
                'Setting paymaster deposit for paymaster if it does not exist',
              )
              acc.paymasterDeposit[paymaster] =
                await opts.entryPointContract.balanceOf(paymaster)
            }
          }

          const [paymasterStatus, factoryStatus] = await Promise.all([
            reputationManager.getStatus(paymaster),
            reputationManager.getStatus(factory),
          ])

          // re-validate UserOp and remove from mempool if failed. no need to check stake, since it cannot be reduced between first and 2nd validation
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
          const { include, reason } = shouldIncludeInBundle({
            userOp,
            paymasterStatus,
            factoryStatus,
            validationResult,
            stakedEntityCount: acc.stakedEntityCount,
            paymasterDeposit: acc.paymasterDeposit,
            throttledEntityBundleCount: THROTTLED_ENTITY_BUNDLE_COUNT,
            totalGas: acc.totalGas,
            maxBundleGas: opts.maxBundleGas,
            knownSenders,
            senders: acc.senders,
          })

          if (!include) {
            Logger.debug({ userOp, reason }, 'skipping user operation')
            reason === 'banned'
              ? acc.markedToRemoveUserOpsHashes.push({
                  userOpHash: userOpHash,
                  paymaster: userOp.paymaster,
                })
              : acc.notIncludedUserOpsHashes.push(userOpHash)

            return acc
          }

          // Update staked entity counts and deposits
          const { stakedEntityCount, paymasterDeposit } =
            await updateEntityStakeCountAndDeposit({
              userOp,
              validationResult,
              stakedEntityCount: acc.stakedEntityCount,
              paymasterDeposit: acc.paymasterDeposit,
            })
          acc.stakedEntityCount = stakedEntityCount
          acc.paymasterDeposit = paymasterDeposit

          Logger.debug(
            { sender: userOp.sender, nonce: userOp.nonce },
            'Adding UserOp to bundle',
          )
          mergeStorageMap(acc.storageMap, validationResult.storageMap)
          acc.bundle.push(userOp)
          acc.totalGas +=
            BigInt(validationResult.returnInfo.preOpGas) +
            BigInt(userOp.callGasLimit)
          acc.senders.add(sender)

          return acc
        }, Promise.resolve(bundleBuilderResult))

      const {
        bundle,
        storageMap,
        notIncludedUserOpsHashes,
        markedToRemoveUserOpsHashes,
      } = await buildBundle()

      await afterHook(notIncludedUserOpsHashes, markedToRemoveUserOpsHashes)

      return {
        bundle,
        storageMap,
      }
    },
  }
}
