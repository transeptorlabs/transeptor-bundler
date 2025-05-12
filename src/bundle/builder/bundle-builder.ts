/* eslint-disable complexity */
import { ethers } from 'ethers'
import { Logger } from '../../logger/index.js'
import {
  StorageMap,
  UserOperation,
  ReputationManager,
  MempoolEntry,
  MempoolManagerBuilder,
  BundleBuilder,
  BundleBuilderResult,
  BundleReadyToSend,
  RemoveUserOpDetails,
} from '../../types/index.js'
import { mergeStorageMap } from '../../utils/index.js'
import { ValidationService } from '../../validation/index.js'
import {
  validateUserOperation,
  shouldIncludeInBundle,
  updateEntityStakeCountAndDeposit,
  parseFailedOpRevert,
} from './builder-helpers.js'
import { findEntityToBlame, checkFatal } from '../bundle.helper.js'

export type BundleBuilderConfig = {
  validationService: ValidationService
  reputationManager: ReputationManager
  mempoolManagerBuilder: MempoolManagerBuilder
  opts: {
    maxBundleGas: number
    txMode: string
    entryPointContract: ethers.Contract
    entryPointAddress: string
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
        if (opDetails.reason === 'failed-2nd-validation' && opDetails.err) {
          const failedValError = opDetails.err
          Logger.debug({ error: failedValError }, 'failed 2nd validation')
          const { opIndex, reasonStr } = parseFailedOpRevert(
            failedValError,
            config.opts.entryPointContract,
          )
          if (opIndex == null || reasonStr == null) {
            checkFatal(failedValError)
            Logger.warn('Failed validation, but non-FailedOp error')
            await mempoolManagerBuilder.removeUserOp(opDetails.userOpHash)
            return
          }

          const addr = await findEntityToBlame(
            reasonStr,
            opDetails.userOp,
            reputationManager,
            config.opts.entryPointAddress,
          )
          if (addr !== null) {
            // TODO: Make this a batch operation to the reputationManager
            // undo all "updateSeen" of all entities, and only blame "addr":
            await reputationManager.updateSeenStatus(
              opDetails.userOp.sender,
              'decrement',
            )
            await reputationManager.updateSeenStatus(
              opDetails.userOp.paymaster,
              'decrement',
            )
            await reputationManager.updateSeenStatus(
              opDetails.userOp.factory,
              'decrement',
            )
            await reputationManager.updateSeenStatus(addr, 'increment')
          }
        }

        // failed validation or entity banned. don't try anymore this userOp
        await mempoolManagerBuilder.removeUserOp(opDetails.userOpHash)
      }
    }
  }

  return {
    createBundle: async (force?: boolean): Promise<BundleReadyToSend> => {
      Logger.info('Attempting to create bundle')
      const entries = await getEntries(force)
      if (entries.length === 0) {
        return {
          bundle: [],
          storageMap: {},
        }
      }

      const knownSenders = await mempoolManagerBuilder.getKnownSenders()
      const bundleBuilderResult: BundleBuilderResult = {
        bundle: [] as UserOperation[],
        storageMap: {} as StorageMap,
        notIncludedUserOpsHashes: [] as string[],
        markedToRemoveUserOpsHashes: [] as RemoveUserOpDetails[],
        totalGas: BigInt(0),
        paymasterDeposit: {} as { [paymaster: string]: bigint }, // paymaster deposit should be enough for all UserOps in the bundle
        stakedEntityCount: {} as { [addr: string]: number }, // throttled paymasters and deployers are allowed only small UserOps per bundle
        senders: new Set<string>(), // each sender is allowed only once per bundle
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
          const { validationResult, passedValidation, reValidateError } =
            await validateUserOperation(
              userOp,
              referencedContracts,
              validationService,
            )

          if (validationResult === null || !passedValidation) {
            Logger.error(
              { error: reValidateError, userOp },
              'failed 2nd validation, marking removal from mempool:',
            )
            acc.markedToRemoveUserOpsHashes.push({
              userOp,
              userOpHash: userOpHash,
              reason: 'failed-2nd-validation',
              err: reValidateError,
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
                  userOp,
                  reason,
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
