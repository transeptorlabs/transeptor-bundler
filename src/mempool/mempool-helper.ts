import { BigNumberish } from 'ethers'

import { Logger } from '../logger/index.js'
import { ReputationManager } from '../reputation/index.js'
import { UserOperation } from '../types/index.js'
import { StakeInfo, ValidationErrors } from '../validation/index.js'
import { RpcError } from '../utils/index.js'
import {
  EntryCount,
  MempoolEntry,
  StandardPool,
  State,
} from '../state/index.js'
import { Either } from '../monad/index.js'
import {
  MempoolEntryMetadata,
  MempoolEntryWithMetadata,
} from './mempool.types.js'

/**
 * Checks the reputation status of the given stakeInfo.
 * Banned: If the entity is banned, an error is thrown as banned entities are not allowed to add UserOperations.
 *
 * @param reputationManager - The ReputationManager to use for checking the reputation status.
 * @param mempoolEntryCount - The current mempool entry count.
 * @param title - The title of the entity to check the reputation status for.
 * @param stakeInfo - The StakeInfo of the entity to check the reputation status for.
 * @param maxTxMempoolAllowedOverride  - The maximum number of transactions allowed in the mempool for the entity.
 */
export const checkReputationStatus = async (
  reputationManager: ReputationManager,
  mempoolEntryCount: EntryCount,
  title: 'account' | 'paymaster' | 'aggregator' | 'deployer',
  stakeInfo: StakeInfo,
  maxTxMempoolAllowedOverride?: number,
): Promise<void> => {
  const THROTTLED_ENTITY_MEMPOOL_COUNT = 4
  const maxTxMempoolAllowedEntity =
    maxTxMempoolAllowedOverride ??
    (await reputationManager.calculateMaxAllowedMempoolOpsUnstaked(
      stakeInfo.addr,
    ))

  await reputationManager.checkBanned(title, stakeInfo)

  const foundCount = mempoolEntryCount[stakeInfo.addr.toLowerCase()] ?? 0
  if (foundCount > THROTTLED_ENTITY_MEMPOOL_COUNT) {
    await reputationManager.checkThrottled(title, stakeInfo)
  }
  if (foundCount >= maxTxMempoolAllowedEntity) {
    await reputationManager.checkStake(title, stakeInfo)
  }
}

/**
 * Checks the reputation status of the given entities.
 *
 * @param reputationManager - The ReputationManager to use for checking the reputation status.
 * @param mempoolEntryCount - The current mempool entry count.
 * @param mempoolEntryMetadata - The metadata of the entities to check the reputation status for.
 */
export const checkReputation = async (
  reputationManager: ReputationManager,
  mempoolEntryCount: EntryCount,
  mempoolEntryMetadata: MempoolEntryMetadata,
): Promise<void> => {
  const MAX_MEMPOOL_USEROPS_PER_SENDER = 4 // max # of pending mempool entities per sender
  const { senderInfo, paymasterInfo, factoryInfo, aggregatorInfo } =
    mempoolEntryMetadata

  await checkReputationStatus(
    reputationManager,
    mempoolEntryCount,
    'account',
    senderInfo,
    MAX_MEMPOOL_USEROPS_PER_SENDER,
  )

  if (paymasterInfo != null) {
    await checkReputationStatus(
      reputationManager,
      mempoolEntryCount,
      'paymaster',
      paymasterInfo,
    )
  }

  if (factoryInfo != null) {
    await checkReputationStatus(
      reputationManager,
      mempoolEntryCount,
      'deployer',
      factoryInfo,
    )
  }

  if (aggregatorInfo != null) {
    await checkReputationStatus(
      reputationManager,
      mempoolEntryCount,
      'aggregator',
      aggregatorInfo,
    )
  }
}

/**
 * Updates the seen status of the given entities.
 *
 * @param aggregator - The aggregator address to update the seen status for.
 * @param userOp - The UserOperation to update the seen status for.
 * @param reputationManager - The ReputationManager to use for updating the seen status.
 */
export const updateSeenStatus = async (
  aggregator: string | undefined,
  userOp: UserOperation,
  reputationManager: ReputationManager,
): Promise<void> => {
  try {
    await reputationManager.updateSeenStatus(userOp.sender, 'increment')
  } catch (e: any) {
    if (!(e instanceof RpcError)) throw e
  }

  const addrs = [userOp.paymaster, userOp.factory, aggregator].filter(
    (addr) => addr != undefined,
  ) as string[]
  await reputationManager.updateSeenStatusBatch(addrs)
}

/**
 * Returns all addresses that are currently known to be "senders" according to the current mempool.
 *
 * @param standardPool - The standard pool to search in.
 * @returns - An array of known sender addresses in lowercase.
 */
export const getKnownSenders = (standardPool: StandardPool): string[] => {
  const entries = Object.values(standardPool)
  if (entries.length === 0) {
    return []
  }

  const initialValue: string[] = []
  return entries
    .map((mempoolEntry) => mempoolEntry.userOp)
    .reduce((acc, userOp) => {
      return [...acc, userOp.sender.toLowerCase()]
    }, initialValue)
}

/**
 * Returns all addresses that are currently known to be any kind of entity according to the current mempool.
 *
 *  @param standardPool - The standard pool to search in.
 * @returns - An array of known entity addresses in lowercase.
 */
export const getKnownEntities = (standardPool: StandardPool): string[] => {
  const entries = Object.values(standardPool)
  if (entries.length === 0) {
    return []
  }

  const initialValue: string[] = []
  const res = entries
    .map((mempoolEntry) => mempoolEntry.userOp)
    .reduce((acc, userOp) => {
      return [
        ...acc,
        userOp.paymaster ? userOp.paymaster : '0x',
        userOp.factory ? userOp.factory : '0x',
      ]
    }, initialValue)

  return res
    .filter((entryAddress) => entryAddress != '0x')
    .map((it) => (it as string).toLowerCase())
}

/**
 * Checks if the UserOperation violates the multiple roles rule.
 *
 * @param mempoolEntryWithMetadata - The MempoolEntryWithMetadata to check for multiple roles violation.
 * @param knownEntities - The known entities in the mempool.
 * @param knownSenders - The known senders in the mempool.
 * @returns - Either the MempoolEntryWithMetadata, or an RpcError.
 */
export const checkMultipleRolesViolation = (
  mempoolEntryWithMetadata: MempoolEntryWithMetadata,
  knownEntities: string[],
  knownSenders: string[],
): Either<RpcError, MempoolEntryWithMetadata> => {
  const entry = mempoolEntryWithMetadata[0]
  const userOp = entry.userOp
  const res = Either.Right<RpcError, MempoolEntryWithMetadata>(
    mempoolEntryWithMetadata,
  )

  if (knownEntities.includes(userOp.sender.toLowerCase())) {
    return Either.Left(
      new RpcError(
        `The sender address "${userOp.sender}" is used as a different entity in another UserOperation currently in mempool`,
        ValidationErrors.OpcodeValidation,
      ),
    )
  }

  const paymaster = userOp.paymaster
  const factory = userOp.factory

  const isPaymasterSenderViolation = knownSenders.includes(
    paymaster?.toLowerCase() ?? '',
  )
  const isFactorySenderViolation = knownSenders.includes(
    factory?.toLowerCase() ?? '',
  )

  if (isPaymasterSenderViolation) {
    return Either.Left(
      new RpcError(
        `A Paymaster at ${paymaster as string} in this UserOperation is used as a sender entity in another UserOperation currently in mempool.`,
        ValidationErrors.OpcodeValidation,
      ),
    )
  }
  if (isFactorySenderViolation) {
    return Either.Left(
      new RpcError(
        `A Factory at ${factory as string} in this UserOperation is used as a sender entity in another UserOperation currently in mempool.`,
        ValidationErrors.OpcodeValidation,
      ),
    )
  }

  return res
}

/**
 * Checks if the UserOperation needs to be replaced.
 *
 * @param mempoolEntryWithMetadata - The MempoolEntryWithMetadata to check for replacement.
 * @returns - Either the MempoolEntryWithMetadata with the oldEntryUserOpHash field updated, or an RpcError.
 */
export const checkReplaceUserOp = (
  mempoolEntryWithMetadata: MempoolEntryWithMetadata,
): Either<RpcError, MempoolEntryWithMetadata> => {
  const [entry, metadata] = mempoolEntryWithMetadata
  const { oldEntry } = metadata
  const res = Either.Right<RpcError, MempoolEntryWithMetadata>(
    mempoolEntryWithMetadata,
  )
  if (!oldEntry) {
    return res
  }

  const oldMaxPriorityFeePerGas = Number(
    BigInt(oldEntry.userOp.maxPriorityFeePerGas),
  )
  const newMaxPriorityFeePerGas = Number(
    BigInt(entry.userOp.maxPriorityFeePerGas),
  )
  const oldMaxFeePerGas = Number(BigInt(oldEntry.userOp.maxFeePerGas))
  const newMaxFeePerGas = Number(BigInt(entry.userOp.maxFeePerGas))

  // the error is "invalid fields", even though it is detected only after validation
  if (!(newMaxPriorityFeePerGas >= oldMaxPriorityFeePerGas * 1.1)) {
    return Either.Left(
      new RpcError(
        `Replacement UserOperation must have higher maxPriorityFeePerGas (old=${oldMaxPriorityFeePerGas} new=${newMaxPriorityFeePerGas}) `,
        ValidationErrors.InvalidFields,
      ),
    )
  }

  if (!(newMaxFeePerGas >= oldMaxFeePerGas * 1.1)) {
    return Either.Left(
      new RpcError(
        `Replacement UserOperation must have higher maxFeePerGas (old=${oldMaxFeePerGas} new=${newMaxFeePerGas}) `,
        ValidationErrors.InvalidFields,
      ),
    )
  }

  return res
}

/**
 * Finds a MempoolEntry by the sender address and nonce.
 *
 * @param sender - The sender address to search for.
 * @param nonce - The nonce to search for.
 * @param standardPool - The standard pool to search in.
 * @returns - The MempoolEntry associated with the sender and nonce, or undefined if not found.
 */
export const findBySenderNonce = (
  sender: string,
  nonce: BigNumberish,
  standardPool: StandardPool,
): MempoolEntry | undefined => {
  const entries = Object.values(standardPool)
  if (entries.length === 0) {
    return undefined
  }

  return entries.find((entry) => {
    return (
      entry.userOp.sender.toLowerCase() === sender.toLowerCase() &&
      BigInt(entry.userOp.nonce) === BigInt(nonce)
    )
  })
}

/**
 * Checks new UserOperation for reputation status and throttling or checks if it needs to be replaced.
 *
 * @param reputationManager - The ReputationManager to use for checking the reputation status.
 * @param mempoolEntryCount - The current mempool entry count.
 * @param standardPool - The standard pool to search in.
 * @param mempoolEntryWithMetadata - The MempoolEntryWithMetadata to check the reputation status for.
 * @returns - Either the MempoolEntry and MempoolEntryMetadata with the oldEntryUserOpHash field updated, or an RpcError.
 */
export const replaceOrAddUserOpChecks = async (
  reputationManager: ReputationManager,
  mempoolEntryCount: EntryCount,
  standardPool: StandardPool,
  mempoolEntryWithMetadata: MempoolEntryWithMetadata,
): Promise<Either<RpcError, MempoolEntryWithMetadata>> => {
  const [entry, mempoolEntryMetadata] = mempoolEntryWithMetadata
  const { userOp } = entry
  const res = Either.Right<RpcError, MempoolEntryWithMetadata>(
    mempoolEntryWithMetadata,
  )

  const oldEntry = findBySenderNonce(userOp.sender, userOp.nonce, standardPool)
  if (oldEntry) {
    Logger.debug('Old entry found, checking if needs replacement...')

    return res
      .map((mempoolEntryWithMetadata) => {
        const [entry, metadata] = mempoolEntryWithMetadata
        return [
          entry,
          {
            ...metadata,
            oldEntry,
          },
        ] as MempoolEntryWithMetadata
      })
      .flatMap(checkReplaceUserOp)
  }

  Logger.debug('New entry, checking reputation and throttling...')
  await checkReputation(
    reputationManager,
    mempoolEntryCount,
    mempoolEntryMetadata,
  )

  return res.flatMap((mempoolEntryWithMetadata) =>
    checkMultipleRolesViolation(
      mempoolEntryWithMetadata,
      getKnownEntities(standardPool),
      getKnownSenders(standardPool),
    ),
  )
}

/**
 * Updates the mempool state with the new MempoolEntry and metadata.
 *
 * @param mempoolEntryWithMetadata - The MempoolEntryWithMetadata to update the state with.
 * @param standardPool - The standard pool to update.
 * @param mempoolEntryCount - The current mempool entry count.
 * @returns - The updated state with the new MempoolEntry and metadata.
 */
export const doUpdateMempoolState = (
  mempoolEntryWithMetadata: MempoolEntryWithMetadata,
  standardPool: StandardPool,
  mempoolEntryCount: EntryCount,
): Partial<State> => {
  const [entry, metadata] = mempoolEntryWithMetadata
  const { userOpHash, userOp } = entry
  const { oldEntry } = metadata

  if (oldEntry) {
    Logger.debug('Replacing userOp in mempool...')
    delete standardPool[oldEntry.userOpHash]
    return {
      mempoolEntryCount,
      standardPool: {
        ...standardPool,
        [userOpHash]: entry,
      },
    }
  }

  Logger.debug('Reputation and throttling checks passed, adding to mempool...')
  const sender = userOp.sender.toLowerCase()
  const entriesCountToUpdate: EntryCount = {
    [sender]: (mempoolEntryCount[sender] ?? 0) + 1,
  }

  if (userOp.paymaster) {
    const paymaster = userOp.paymaster.toLowerCase()
    if (paymaster !== '0x') {
      Logger.debug({ addr: paymaster }, 'Updating paymaster count...')
      entriesCountToUpdate[paymaster] = (mempoolEntryCount[paymaster] ?? 0) + 1
    }
  }

  if (userOp.factory) {
    const factory = userOp.factory.toLowerCase()
    if (factory !== '0x') {
      Logger.debug({ addr: factory }, 'Updating factory count...')
      entriesCountToUpdate[factory] = (mempoolEntryCount[factory] ?? 0) + 1
    }
  }

  return {
    standardPool: {
      ...standardPool,
      [userOpHash]: entry,
    },
    mempoolEntryCount: {
      ...mempoolEntryCount,
      ...entriesCountToUpdate,
    },
  }
}
