import { BigNumber, ethers } from 'ethers'
import { MempoolEntry, ReputationStatus, StorageMap, UserOperation, ValidateUserOpResult } from '../types'
import { MempoolManager } from '../mempool'
import { getAddr, mergeStorageMap } from '../utils'
import { ReputationManager } from '../reputation'
import { ProviderService } from '../provider'
import { ValidationService } from '../validation'
import { Logger } from '../logger'

/*
  BundleProcessor: This class will attempt to process(send) userOperations as bundles
*/
export class BundleProcessor {
  private readonly providerService: ProviderService
  private readonly validationService: ValidationService
  private readonly reputationManager: ReputationManager
  private readonly mempoolManager: MempoolManager

  private readonly maxBundleGas: number
  private readonly entryPointContract: ethers.Contract
  private readonly isConditionalTxMode: boolean

  constructor(
    providerService: ProviderService,
    validationService: ValidationService,
    reputationManager: ReputationManager,
    mempoolManager: MempoolManager,
    maxBundleGas: number,
    entryPointContract: ethers.Contract,
    isConditionalTxMode: boolean
  ) {
    this.providerService = providerService
    this.validationService = validationService
    this.reputationManager = reputationManager
    this.mempoolManager = mempoolManager
    this.maxBundleGas = maxBundleGas
    this.entryPointContract = entryPointContract
    this.isConditionalTxMode = isConditionalTxMode
  }

  /*
    submit a bundle. After submitting the bundle, remove the remove UserOps from the mempool 
  */
  async sendNextBundle(isAuto: boolean = false): Promise<string> {
    if (this.mempoolManager.size() === 0) {
      Logger.debug('No user ops to bundle')
      return 'ok'
    }

    // if isAuto is true, send the all pending UserOps in the mempool as a bundle
    const entries: MempoolEntry[] = isAuto ? await this.mempoolManager.getAllPending() : await this.mempoolManager.getNextPending()
    const [bundle, storageMap] = await this.createBundle(entries)
    Logger.debug({length: bundle.length, bundle}, 'bundle created')

    return 'sendingNextBundle_txHash'
  }

  private async createBundle(
    entries: MempoolEntry[]
  ): Promise<[UserOperation[], StorageMap]> {
    const bundle: UserOperation[] = []
    const storageMap: StorageMap = {}
    let totalGas = BigNumber.from(0)

    // paymaster deposit should be enough for all UserOps in the bundle.
    const paymasterDeposit: { [paymaster: string]: BigNumber } = {}
    // throttled paymasters and deployers are allowed only small UserOps per bundle.
    const stakedEntityCount: { [addr: string]: number } = {}
    // each sender is allowed only once per bundle
    const senders = new Set<string>()

    for (const entry of entries) {
      const paymaster = getAddr(entry.userOp.paymasterAndData)
      const factory = getAddr(entry.userOp.initCode)
      const paymasterStatus = this.reputationManager.getStatus(paymaster)
      const deployerStatus = this.reputationManager.getStatus(factory)

      // check entry reputation status
      if (
        paymasterStatus === ReputationStatus.BANNED ||
        deployerStatus === ReputationStatus.BANNED
      ) {
        this.mempoolManager.removeUserOp(entry.userOpHash)
        continue
      }

      if (
        paymaster != null &&
        (paymasterStatus === ReputationStatus.THROTTLED ??
          (stakedEntityCount[paymaster] ?? 0) > 1)
      ) {
        Logger.debug(
          {   
            sender: entry.userOp.sender,
            nonce: entry.userOp.nonce
          },
          'skipping throttled paymaster'
        )
        continue
      }

      if (
        factory != null &&
        (deployerStatus === ReputationStatus.THROTTLED ??
          (stakedEntityCount[factory] ?? 0) > 1)
      ) {
        Logger.debug(
          {
            sender: entry.userOp.sender,
            nonce: entry.userOp.nonce
          },
          'skipping throttled factory'
        )
        continue
      }

      if (senders.has(entry.userOp.sender)) {
        Logger.debug(
          {
            semder: entry.userOp.sender,
            nonce: entry.userOp.nonce
          },
          'skipping already included sender'
        )
        // allow only a single UserOp per sender per bundle
        continue
      }

      // validate UserOp and remove from mempool if failed
      let validationResult: ValidateUserOpResult
      try {
        // re-validate UserOp. no need to check stake, since it cannot be reduced between first and 2nd validation
        validationResult = await this.validationService.validateUserOp(
          entry.userOp,
          entry.referencedContracts,
          false
        )
      } catch (e: any) {
        Logger.error({error: e.message}, 'failed 2nd validation:')
        // failed validation. don't try anymore
        this.mempoolManager.removeUserOp(entry.userOpHash)
        continue
      }

      // TODO: we take UserOp's callGasLimit, even though it will probably require less (but we don't
      // attempt to estimate it to check)
      // which means we could "cram" more UserOps into a bundle.
      const userOpGasCost = BigNumber.from(
        validationResult.returnInfo.preOpGas
      ).add(entry.userOp.callGasLimit)
      const newTotalGas = totalGas.add(userOpGasCost)
      if (newTotalGas.gt(this.maxBundleGas)) {
        break
      }

      if (paymaster != null) {
        if (paymasterDeposit[paymaster] == null) {
          paymasterDeposit[paymaster] =
            await this.entryPointContract.balanceOf(paymaster)
        }
        if (
          paymasterDeposit[paymaster].lt(validationResult.returnInfo.prefund)
        ) {
          // not enough balance in paymaster to pay for all UserOps
          // (but it passed validation, so it can sponsor them separately
          continue
        }
        stakedEntityCount[paymaster] = (stakedEntityCount[paymaster] ?? 0) + 1
        paymasterDeposit[paymaster] = paymasterDeposit[paymaster].sub(
          validationResult.returnInfo.prefund
        )
      }

      if (factory != null) {
        stakedEntityCount[factory] = (stakedEntityCount[factory] ?? 0) + 1
      }

      // If sender's account already exist: replace with its storage root hash
      if (this.isConditionalTxMode && entry.userOp.initCode.length <= 2) {
        // in conditionalRpc: always put root hash (not specific storage slots) for "sender" entries
        const { storageHash } = await this.providerService.send(
          'eth_getProof',
          [entry.userOp.sender, [], 'latest']
        )
        storageMap[entry.userOp.sender.toLowerCase()] = storageHash
      }
      mergeStorageMap(storageMap, validationResult.storageMap)

      senders.add(entry.userOp.sender)
      bundle.push(entry.userOp)
      totalGas = newTotalGas
    }

    return [bundle, storageMap]
  }
}