import { ErrorDescription } from '@ethersproject/abi/lib/interface'
import { BigNumber, ContractFactory, ethers, Wallet } from 'ethers'

import {
  GET_USEROP_HASHES_ABI,
  GET_USEROP_HASHES_BYTECODE,
} from '../../../shared/abis/index.js'
import { Logger } from '../../../shared/logger/index.js'
import {
  MempoolEntry,
  MempoolManager,
} from '../../../bundler-builder/src/mempool/index.js'
import { ProviderService } from '../../../shared/provider/index.js'
import {
  SendBundleReturn,
  StorageMap,
  UserOperation,
} from '../../../shared/types/index.js'
import { mergeStorageMap, packUserOps } from '../../../shared/utils/index.js'
import {
  ValidateUserOpResult,
  ValidationService,
} from '../../../shared/validatation/index.js'
import { ReputationManager, ReputationStatus } from '../reputation/index.js'
import {
  BundlerSignerWallets,
  createSignerService,
  SignerService,
} from '../signer/index.js'

/*
  BundleProcessor: This class will attempt to process(send) userOperations as bundles
*/
export class BundleProcessor {
  private readonly providerService: ProviderService
  private readonly validationService: ValidationService
  private readonly reputationManager: ReputationManager
  private readonly mempoolManager: MempoolManager
  private readonly signers: BundlerSignerWallets

  private readonly maxBundleGas: number
  private readonly entryPointContract: ethers.Contract
  private readonly txMode: string
  private readonly beneficiary: string
  public readonly minSignerBalance: BigNumber
  private readonly isUnsafeMode: boolean
  private readonly THROTTLED_ENTITY_BUNDLE_COUNT = 4
  private ss: SignerService

  constructor(
    providerService: ProviderService,
    validationService: ValidationService,
    reputationManager: ReputationManager,
    mempoolManager: MempoolManager,
    maxBundleGas: number,
    entryPointContract: ethers.Contract,
    txMode: string,
    beneficiary: string,
    minSignerBalance: BigNumber,
    isUnsafeMode: boolean,
    signers: BundlerSignerWallets,
  ) {
    this.providerService = providerService
    this.validationService = validationService
    this.reputationManager = reputationManager
    this.mempoolManager = mempoolManager
    this.maxBundleGas = maxBundleGas
    this.entryPointContract = entryPointContract
    this.txMode = txMode
    this.beneficiary = beneficiary
    this.minSignerBalance = minSignerBalance
    this.isUnsafeMode = isUnsafeMode
    this.signers = signers
    this.ss = createSignerService(this.providerService)
  }

  /*
    submit a bundle. After submitting the bundle, remove the remove UserOps from the mempool 
  */
  public async sendNextBundle(isAuto = false): Promise<SendBundleReturn> {
    if ((await this.mempoolManager.size()) === 0) {
      return {
        transactionHash: '',
        userOpHashes: [],
      }
    }
    // TODO: Include entries based off highest fee
    // if isAuto is true, send the all pending UserOps in the mempool as a bundle
    const entries: MempoolEntry[] = isAuto
      ? await this.mempoolManager.getAllPending()
      : await this.mempoolManager.getNextPending()

    const [bundle, storageMap] = await this.createBundle(entries)
    Logger.debug({ length: bundle.length }, 'bundle created(ready to send)')

    if (bundle.length === 0) {
      return {
        transactionHash: '',
        userOpHashes: [],
      }
    } else {
      // TODO: use this.ss.getReadySigner() instead of this.signers[0]
      const signer = this.signers[0]
      const beneficiary = await this.selectBeneficiary(signer)
      const ret = await this.sendBundle(signer, bundle, beneficiary, storageMap)
      return ret
    }
  }

  private async createBundle(
    entries: MempoolEntry[],
  ): Promise<[UserOperation[], StorageMap]> {
    Logger.debug(
      { total: entries.length },
      'Attepting to create bundle for entries',
    )
    const bundle: UserOperation[] = []
    const storageMap: StorageMap = {}
    let totalGas = BigNumber.from(0)
    const paymasterDeposit: { [paymaster: string]: BigNumber } = {} // paymaster deposit should be enough for all UserOps in the bundle.
    const stakedEntityCount: { [addr: string]: number } = {} // throttled paymasters and deployers are allowed only small UserOps per bundle.
    const senders = new Set<string>() // each sender is allowed only once per bundle
    const knownSenders = await this.mempoolManager.getKnownSenders()
    const notIncludedUserOpsHashes = []

    mainLoop: for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const paymaster = entry.userOp.paymaster
      const factory = entry.userOp.factory
      const paymasterStatus = await this.reputationManager.getStatus(paymaster)
      const deployerStatus = await this.reputationManager.getStatus(factory)

      if (
        paymasterStatus === ReputationStatus.BANNED ||
        deployerStatus === ReputationStatus.BANNED
      ) {
        await this.mempoolManager.removeUserOp(entry.userOp)
        continue
      }

      // [SREP-030]
      if (
        paymaster != null &&
        (paymasterStatus === ReputationStatus.THROTTLED ??
          (stakedEntityCount[paymaster] ?? 0) >
            this.THROTTLED_ENTITY_BUNDLE_COUNT)
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
        (deployerStatus === ReputationStatus.THROTTLED ??
          (stakedEntityCount[factory] ?? 0) >
            this.THROTTLED_ENTITY_BUNDLE_COUNT)
      ) {
        Logger.debug(
          { sender: entry.userOp.sender, nonce: entry.userOp.nonce },
          'skipping throttled factory',
        )
        notIncludedUserOpsHashes.push(entry.userOpHash)
        continue
      }
      if (senders.has(entry.userOp.sender)) {
        // allow only a single UserOp per sender per bundle
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
        validationResult = await this.validationService.validateUserOp(
          entry.userOp,
          this.isUnsafeMode,
          false,
          entry.referencedContracts,
        )
      } catch (e: any) {
        Logger.error(
          { error: e.message, entry: entry },
          'failed 2nd validation, removing from mempool:',
        )
        await this.mempoolManager.removeUserOp(entry.userOpHash)
        continue
      }

      // Check if the UserOp accesses a storage of another known sender
      for (const storageAddress of Object.keys(validationResult.storageMap)) {
        if (
          storageAddress.toLowerCase() !== entry.userOp.sender.toLowerCase() &&
          knownSenders.includes(storageAddress.toLowerCase())
        ) {
          Logger.debug(
            `UserOperation from ${entry.userOp.sender} sender accessed a storage of another known sender ${storageAddress}`,
          )
          continue mainLoop
        }
      }

      // TODO: we could "cram" more UserOps into a bundle.
      const userOpGasCost = BigNumber.from(
        validationResult.returnInfo.preOpGas,
      ).add(entry.userOp.callGasLimit)
      const newTotalGas = totalGas.add(userOpGasCost)
      if (newTotalGas.gt(this.maxBundleGas)) {
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
            await this.entryPointContract.balanceOf(paymaster)
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

      // If sender's account already exist: replace with its storage root hash
      if (this.txMode === 'conditional' && entry.userOp.factory === null) {
        // in conditionalRpc: always put root hash (not specific storage slots) for "sender" entries
        const { storageHash } = await this.providerService.send(
          'eth_getProof',
          [entry.userOp.sender, [], 'latest'],
        )
        storageMap[entry.userOp.sender.toLowerCase()] = storageHash
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

    // send ops that back to mempool that were not included in the bundle
    if (notIncludedUserOpsHashes.length > 0) {
      Logger.debug(
        { total: notIncludedUserOpsHashes.length },
        'Sending UserOps back to mempool with status pending',
      )
      for (let i = 0; i < notIncludedUserOpsHashes.length; i++) {
        await this.mempoolManager.updateEntryStatusPending(
          entries[i].userOpHash,
        )
      }
    }

    return [bundle, storageMap]
  }

  /**
   * submit a bundle.
   * after submitting the bundle, remove all UserOps from the mempool
   *
   * @param signer
   * @param userOps
   * @param beneficiary
   * @param storageMap
   * @returns SendBundleReturn the transaction and UserOp hashes on successful transaction, or null on failed transaction
   */
  private async sendBundle(
    signer: Wallet,
    userOps: UserOperation[],
    beneficiary: string,
    storageMap: StorageMap,
  ): Promise<SendBundleReturn> {
    try {
      const feeData = await this.providerService.getFeeData()
      const tx = await this.entryPointContract.populateTransaction.handleOps(
        packUserOps(userOps),
        beneficiary,
        {
          type: 2,
          nonce: await this.ss.getTransactionCount(signer),
          gasLimit: 10e6,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? 0,
          maxFeePerGas: feeData.maxFeePerGas ?? 0,
        },
      )
      tx.chainId = await this.providerService.getChainId()
      const signedTx = await this.ss.signTransaction(tx, signer)

      let ret: string
      if (this.txMode === 'conditional') {
        ret = await this.providerService.send(
          'eth_sendRawTransactionConditional',
          [signedTx, { knownAccounts: storageMap }],
        )
        Logger.debug(
          { ret, length: userOps.length },
          'eth_sendRawTransactionConditional ret=',
        )
      } else {
        ret = await this.providerService.send('eth_sendRawTransaction', [
          signedTx,
        ])
        Logger.debug(
          { ret, length: userOps.length },
          'eth_sendRawTransaction ret=',
        )
      }

      // TODO: parse ret, and revert if needed.

      // hashes are needed for debug rpc only.
      const hashes = await this.getUserOpHashes(userOps)
      return {
        transactionHash: ret,
        userOpHashes: hashes,
      } as SendBundleReturn
    } catch (e: any) {
      let parsedError: ErrorDescription
      try {
        parsedError = this.entryPointContract.interface.parseError(
          e.data?.data ?? e.data,
        )
      } catch (e1) {
        this.checkFatal(e)
        Logger.warn({ e }, 'Failed handleOps, but non-FailedOp error')
        return {
          transactionHash: '',
          userOpHashes: [],
        }
      }

      // update entity reputation staus if it cause handleOps to fail
      const { opIndex, reason } = parsedError.args
      const userOp = userOps[opIndex]
      const reasonStr: string = reason.toString()

      if (reasonStr.startsWith('AA3')) {
        this.reputationManager.crashedHandleOps(userOp.paymaster)
      } else if (reasonStr.startsWith('AA2')) {
        this.reputationManager.crashedHandleOps(userOp.sender)
      } else if (reasonStr.startsWith('AA1')) {
        this.reputationManager.crashedHandleOps(userOp.factory)
      } else {
        await this.mempoolManager.removeUserOp(userOp)
        Logger.warn(
          `Failed handleOps sender=${userOp.sender} reason=${reasonStr}`,
        )
      }
      return {
        transactionHash: '',
        userOpHashes: [],
      }
    }
  }

  /**
   * Determine who should receive the proceedings of the request.
   * if signer balance is too low, send it to signer. otherwise, send to configured beneficiary.
   *
   * @param signer - the signer to check balance.
   * @returns the address of the beneficiary.
   */
  private async selectBeneficiary(signer: Wallet): Promise<string> {
    const currentBalance = await this.ss.getSignerBalance(signer)
    let beneficiary = this.beneficiary
    // below min-balance redeem to the signer, to keep it active.
    if (currentBalance.lte(this.minSignerBalance)) {
      beneficiary = await this.ss.getSignerAddress(signer)
      Logger.debug(
        `low balance. using, ${beneficiary}, as beneficiary instead of , ${this.beneficiary}`,
      )
    }
    return beneficiary
  }

  // fatal errors we know we can't recover
  private checkFatal(e: any): void {
    if (e.error?.code === -32601) {
      throw e
    }
  }

  public async getUserOpHashes(userOps: UserOperation[]): Promise<string[]> {
    const getUserOpCodeHashesFactory = new ethers.ContractFactory(
      GET_USEROP_HASHES_ABI,
      GET_USEROP_HASHES_BYTECODE,
    ) as ContractFactory

    const { userOpHashes } = await this.providerService.getCodeHashes(
      getUserOpCodeHashesFactory,
      [this.entryPointContract.address, packUserOps(userOps)],
    )

    return userOpHashes
  }
}
