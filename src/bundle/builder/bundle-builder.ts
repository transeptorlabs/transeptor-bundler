/* eslint-disable complexity */
import {
  ReputationManager,
  MempoolEntry,
  MempoolManagerBuilder,
  BundleBuilder,
  BundleBuilderResult,
  BundleReadyToSend,
  RemoveUserOpDetails,
  TranseptorLogger,
} from '../../types/index.js'
import { mergeStorageMap, withReadonly } from '../../utils/index.js'
import { ValidationService } from '../../validation/index.js'
import {
  validateUserOperation,
  shouldIncludeInBundle,
  updateEntityStakeCountAndDeposit,
  parseFailedOpRevert,
  mergeEip7702Authorizations,
} from './builder.helpers.js'
import { findEntityToBlame, checkFatal } from '../bundle.helper.js'
import { ProviderService } from '../../provider/index.js'

export type BundleBuilderConfig = {
  providerService: ProviderService
  validationService: ValidationService
  reputationManager: ReputationManager
  mempoolManagerBuilder: MempoolManagerBuilder
  opts: {
    maxBundleGas: number
    txMode: string
  }
  logger: TranseptorLogger
}

/**
 * Creates an instance of the BundleBuilder module.
 *
 * @param config - The configuration object for the BundleBuilder instance.
 * @returns An instance of the BundleBuilder module.
 */
function _createBundleBuilder(
  config: Readonly<BundleBuilderConfig>,
): BundleBuilder {
  const {
    providerService,
    validationService,
    reputationManager,
    mempoolManagerBuilder,
    opts,
    logger,
  } = config
  const entryPoint = providerService.getEntryPointContractDetails()
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
    logger.debug('After hook running for bundle builder')
    if (notIncludedUserOpsHashes.length > 0) {
      logger.debug(
        { total: notIncludedUserOpsHashes.length },
        'Sending userOps not included in built bundle back to mempool with status of pending',
      )
      for (const userOpHash of notIncludedUserOpsHashes) {
        await mempoolManagerBuilder.updateEntryStatus(userOpHash, 'pending')
      }
    }

    if (markedToRemoveUserOpsHashes.length > 0) {
      logger.debug(
        { total: markedToRemoveUserOpsHashes.length },
        'Marked to remove: removing UserOps from mempool',
      )

      for (const opDetails of markedToRemoveUserOpsHashes) {
        if (opDetails.reason === 'failed-2nd-validation' && opDetails.err) {
          const failedValError = opDetails.err
          logger.debug({ error: failedValError }, 'failed 2nd validation')
          const { opIndex, reasonStr } = parseFailedOpRevert(
            failedValError,
            entryPoint.contract,
          )
          if (opIndex == null || reasonStr == null) {
            checkFatal(failedValError)
            logger.warn('Failed validation, but non-FailedOp error')
            await mempoolManagerBuilder.removeUserOp(opDetails.userOpHash)
            return
          }

          const addr = await findEntityToBlame(
            reasonStr,
            opDetails.userOp,
            reputationManager,
            entryPoint.address,
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

  const buildBundle = async (
    entries: MempoolEntry[],
    knownSenders: string[],
    initialBundleBuilderAccResult: BundleBuilderResult,
  ) =>
    await entries.reduce(async (accPromise, entry) => {
      const acc = await accPromise
      const { userOp, userOpHash, referencedContracts } = entry
      const { sender, paymaster, factory } = userOp
      if (paymaster) {
        if (!acc.paymasterDeposit[paymaster]) {
          logger.debug(
            { paymaster },
            'Setting paymaster deposit for paymaster if it does not exist',
          )
          acc.paymasterDeposit[paymaster] =
            await entryPoint.contract.balanceOf(paymaster)
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
        logger.error(
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
        logger.debug({ userOp, reason }, 'skipping user operation')
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

      logger.debug(
        { sender: userOp.sender, nonce: userOp.nonce, userOpHash },
        'Adding UserOp to bundle',
      )
      mergeStorageMap(acc.storageMap, validationResult.storageMap)

      const mergeOk = mergeEip7702Authorizations(entry, acc.eip7702Tuples)
      if (!mergeOk) {
        logger.debug(
          { entry },
          'unable to add bundle as it relies on an EIP-7702 tuple that conflicts with other UserOperations',
        )
        return acc
      }

      acc.bundle.push(userOp)
      acc.totalGas +=
        BigInt(validationResult.returnInfo.preOpGas) +
        BigInt(userOp.callGasLimit)
      acc.senders.add(sender)

      return acc
    }, Promise.resolve(initialBundleBuilderAccResult))

  return {
    createBundle: async (force?: boolean): Promise<BundleReadyToSend> => {
      logger.info('Attempting to create bundle')
      const entries = await getEntries(force)
      if (entries.length === 0) {
        return {
          bundle: [],
          storageMap: {},
          eip7702Tuples: [],
        }
      }

      const knownSenders = await mempoolManagerBuilder.getKnownSenders()
      const initialBundleBuilderAccResult: BundleBuilderResult = {
        bundle: [],
        storageMap: {},
        eip7702Tuples: [], // each entry will add its own eip7702 tuple to this array(ie. shared AuthorizationList)
        notIncludedUserOpsHashes: [],
        markedToRemoveUserOpsHashes: [],
        totalGas: BigInt(0),
        paymasterDeposit: {}, // paymaster deposit should be enough for all UserOps in the bundle
        stakedEntityCount: {}, // throttled paymasters and deployers are allowed only small UserOps per bundle
        senders: new Set<string>(), // each sender is allowed only once per bundle
      }
      const {
        bundle,
        storageMap,
        eip7702Tuples,
        notIncludedUserOpsHashes,
        markedToRemoveUserOpsHashes,
      } = await buildBundle(
        entries,
        knownSenders,
        initialBundleBuilderAccResult,
      )

      await afterHook(notIncludedUserOpsHashes, markedToRemoveUserOpsHashes)

      return {
        bundle,
        storageMap,
        eip7702Tuples,
      }
    },
  }
}

export const createBundleBuilder = withReadonly<
  BundleBuilderConfig,
  BundleBuilder
>(_createBundleBuilder)
