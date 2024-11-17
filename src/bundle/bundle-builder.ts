import { BigNumber, ethers } from 'ethers'
import { Logger } from '../logger/index.js'
import { MempoolEntry } from '../state/index.js'
import { StorageMap, UserOperation } from '../types/index.js'
import { mergeStorageMap, RpcError } from '../utils/index.js'
import {
  ValidateUserOpResult,
  ValidationErrors,
  ValidationService,
} from '../validatation/index.js'
import { ReputationManager, ReputationStatus } from '../reputation/index.js'
import { ProviderService } from '../provider/provider-service.js'

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
  providerService: ProviderService,
  validationService: ValidationService,
  reputationManager: ReputationManager,
  opts: {
    maxBundleGas: number
    txMode: string
    entryPointContract: ethers.Contract
  },
): BundleBuilder => {
  const THROTTLED_ENTITY_BUNDLE_COUNT = 4

  return {
    createBundle: async (
      entries: MempoolEntry[],
      knownSenders: string[],
    ): Promise<BundleReadyToSend> => {
      Logger.info(
        { total: entries.length },
        'Attepting to create bundle from entries',
      )
      const bundle: UserOperation[] = []
      const storageMap: StorageMap = {}
      let totalGas = BigNumber.from(0)
      const paymasterDeposit: { [paymaster: string]: BigNumber } = {} // paymaster deposit should be enough for all UserOps in the bundle.
      const stakedEntityCount: { [addr: string]: number } = {} // throttled paymasters and deployers are allowed only small UserOps per bundle.
      const senders = new Set<string>() // each sender is allowed only once per bundle
      const notIncludedUserOpsHashes: string[] = []
      const markedToRemoveUserOpsHashes: RemoveUserOpDetails[] = []

      mainLoop: for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        const paymaster = entry.userOp.paymaster
        const factory = entry.userOp.factory

        // TODO: Make this a batch call
        const paymasterStatus = await reputationManager.getStatus(paymaster)
        const deployerStatus = await reputationManager.getStatus(factory)

        // Remove UserOps from mempool if paymaster or deployer is banned
        if (
          paymasterStatus === ReputationStatus.BANNED ||
          deployerStatus === ReputationStatus.BANNED
        ) {
          markedToRemoveUserOpsHashes.push({
            userOpHash: entry.userOpHash,
            paymaster: entry.userOp.paymaster,
          })
          continue
        }

        // [SREP-030]
        if (
          paymaster != null &&
          (paymasterStatus === ReputationStatus.THROTTLED ||
            (stakedEntityCount[paymaster] ?? 0) > THROTTLED_ENTITY_BUNDLE_COUNT)
        ) {
          Logger.debug(
            { sender: entry.userOp.sender, nonce: entry.userOp.nonce },
            'skipping throttled paymaster',
          )
          notIncludedUserOpsHashes.push(entry.userOpHash)
          continue
        }

        // [SREP-030]
        if (
          factory != null &&
          (deployerStatus === ReputationStatus.THROTTLED ||
            (stakedEntityCount[factory] ?? 0) > THROTTLED_ENTITY_BUNDLE_COUNT)
        ) {
          Logger.debug(
            { sender: entry.userOp.sender, nonce: entry.userOp.nonce },
            'skipping throttled factory',
          )
          notIncludedUserOpsHashes.push(entry.userOpHash)
          continue
        }

        // allow only a single UserOp per sender per bundle
        if (senders.has(entry.userOp.sender)) {
          Logger.debug(
            { sender: entry.userOp.sender, nonce: entry.userOp.nonce },
            'skipping already included sender',
          )
          notIncludedUserOpsHashes.push(entry.userOpHash)
          continue
        }

        // validate UserOp and remove from mempool if failed
        let validationResult: ValidateUserOpResult
        try {
          // re-validate UserOp. no need to check stake, since it cannot be reduced between first and 2nd validation
          validationResult = await validationService.validateUserOp(
            entry.userOp,
            false,
            entry.referencedContracts,
          )
        } catch (e: any) {
          Logger.error(
            { error: e.message, entry: entry },
            'failed 2nd validation, removing from mempool:',
          )

          markedToRemoveUserOpsHashes.push({
            err:
              e instanceof RpcError
                ? {
                    message: e.message,
                    errorCode: e.code,
                  }
                : {
                    message: e.message,
                    errorCode: ValidationErrors.InternalError,
                  },
            userOpHash: entry.userOpHash,
            paymaster,
          })
          continue
        }

        // [STO-041] Check if the UserOp accesses a storage of another known sender and ban the sender if so
        for (const storageAddress of Object.keys(validationResult.storageMap)) {
          if (
            storageAddress.toLowerCase() !==
              entry.userOp.sender.toLowerCase() &&
            knownSenders.includes(storageAddress.toLowerCase())
          ) {
            Logger.debug(
              `UserOperation from ${entry.userOp.sender} sender accessed a storage of another known sender ${storageAddress}`,
            )
            notIncludedUserOpsHashes.push(entry.userOpHash)
            continue mainLoop
          }
        }

        // TODO: we could "cram" more UserOps into a bundle.
        const userOpGasCost = BigNumber.from(
          validationResult.returnInfo.preOpGas,
        ).add(entry.userOp.callGasLimit)
        const newTotalGas = totalGas.add(userOpGasCost)
        if (newTotalGas.gt(opts.maxBundleGas)) {
          Logger.debug(
            { stopIndex: i, entriesLength: entries.length },
            'Bundle is full sending user ops back to mempool with status pending',
          )

          // bundle is full set the remaining UserOps back to pending
          for (let j = i; j < entries.length; j++) {
            notIncludedUserOpsHashes.push(entries[j].userOpHash)
          }
          break
        }

        // get paymaster deposit and stakedEntityCount
        if (paymaster != null) {
          if (paymasterDeposit[paymaster] == null) {
            paymasterDeposit[paymaster] =
              await opts.entryPointContract.balanceOf(paymaster)
          }
          if (
            paymasterDeposit[paymaster].lt(validationResult.returnInfo.prefund)
          ) {
            // not enough balance in paymaster to pay for all UserOp
            // (but it passed validation, so it can sponsor them separately
            continue
          }
          stakedEntityCount[paymaster] = (stakedEntityCount[paymaster] ?? 0) + 1
          paymasterDeposit[paymaster] = paymasterDeposit[paymaster].sub(
            validationResult.returnInfo.prefund,
          )
        }

        // get factory stakedEntityCount
        if (factory != null) {
          stakedEntityCount[factory] = (stakedEntityCount[factory] ?? 0) + 1
        }

        mergeStorageMap(storageMap, validationResult.storageMap)

        // add UserOp to bundle
        Logger.debug(
          { sender: entry.userOp.sender, nonce: entry.userOp.nonce, index: i },
          'adding to bundle',
        )
        senders.add(entry.userOp.sender)
        bundle.push(entry.userOp)
        totalGas = newTotalGas
      }

      return {
        bundle,
        storageMap,
        notIncludedUserOpsHashes,
        markedToRemoveUserOpsHashes,
      }
    },
  }
}
