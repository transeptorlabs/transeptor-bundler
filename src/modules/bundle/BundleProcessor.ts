import { BigNumber, ContractFactory, ethers } from 'ethers'
import {
  MempoolEntry,
  ReputationStatus,
  SendBundleReturn,
  StorageMap,
  UserOperation,
  ValidateUserOpResult,
} from '../types'
import { MempoolManager } from '../mempool'
import { GET_USEROP_HASHES_ABI, GET_USEROP_HASHES_BYTECODE, getAddr, mergeStorageMap } from '../utils'
import { ReputationManager } from '../reputation'
import { ProviderService } from '../provider'
import { ValidationService } from '../validation'
import { Logger } from '../logger'
import { ErrorDescription } from '@ethersproject/abi/lib/interface'

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
  private readonly txMode: string
  private readonly beneficiary: string
  public readonly minSignerBalance: BigNumber

  constructor(
    providerService: ProviderService,
    validationService: ValidationService,
    reputationManager: ReputationManager,
    mempoolManager: MempoolManager,
    maxBundleGas: number,
    entryPointContract: ethers.Contract,
    txMode: string,
    beneficiary: string,
    minSignerBalance: BigNumber
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
  }

  /*
    submit a bundle. After submitting the bundle, remove the remove UserOps from the mempool 
  */
  public async sendNextBundle(isAuto = false): Promise<SendBundleReturn> {
    if (this.mempoolManager.size() === 0) {
      Logger.debug('No user ops to bundle')
      return {
        transactionHash: 'ok',
        userOpHashes: []
      }
    }

    // if isAuto is true, send the all pending UserOps in the mempool as a bundle
    const entries: MempoolEntry[] = isAuto
      ? await this.mempoolManager.getAllPending()
      : await this.mempoolManager.getNextPending()
    
    const [bundle, storageMap] = await this.createBundle(entries)
    Logger.debug({ length: bundle.length, bundle }, 'bundle created')

    if (bundle.length === 0) {
      Logger.debug('sendNextBundle - no bundle to send')
      return {
        transactionHash: 'ok',
        userOpHashes: []
      }
    } else {
      const beneficiary = await this.selectBeneficiary()
      const ret = await this.sendBundle(bundle, beneficiary, storageMap)
      Logger.debug(`sendNextBundle exit - after sent a bundle of ${bundle.length} `)
      return ret
    }
  }

  private async createBundle(entries: MempoolEntry[]): Promise<[UserOperation[], StorageMap]> {
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
            nonce: entry.userOp.nonce,
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
            nonce: entry.userOp.nonce,
          },
          'skipping throttled factory'
        )
        continue
      }

      if (senders.has(entry.userOp.sender)) {
        Logger.debug(
          {
            semder: entry.userOp.sender,
            nonce: entry.userOp.nonce,
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
        Logger.error({ error: e.message, entry: entry }, 'failed 2nd validation:')
        // failed validation. don't try anymore
        this.mempoolManager.removeUserOp(entry.userOpHash)
        continue
      }

      // TODO: we take UserOp's callGasLimit, even though it will probably require less (but we don't
      // attempt to estimate it to check)
      // which means we could "cram" more UserOps into a bundle.
      const userOpGasCost = BigNumber.from(validationResult.returnInfo.preOpGas).add(entry.userOp.callGasLimit)
      const newTotalGas = totalGas.add(userOpGasCost)
      if (newTotalGas.gt(this.maxBundleGas)) {
        // TODO: bundle is full set the UserOp back to pending
        break
      }

      if (paymaster != null) {
        if (paymasterDeposit[paymaster] == null) {
          paymasterDeposit[paymaster] = await this.entryPointContract.balanceOf(paymaster)
        }
        if (paymasterDeposit[paymaster].lt(validationResult.returnInfo.prefund)) {
          // not enough balance in paymaster to pay for all UserOps
          // (but it passed validation, so it can sponsor them separately
          continue
        }
        stakedEntityCount[paymaster] = (stakedEntityCount[paymaster] ?? 0) + 1
        paymasterDeposit[paymaster] = paymasterDeposit[paymaster].sub(validationResult.returnInfo.prefund)
      }

      if (factory != null) {
        stakedEntityCount[factory] = (stakedEntityCount[factory] ?? 0) + 1
      }

      // If sender's account already exist: replace with its storage root hash
      if (this.txMode === 'conditional' && entry.userOp.initCode.length <= 2) {
        // in conditionalRpc: always put root hash (not specific storage slots) for "sender" entries
        const { storageHash } = await this.providerService.send('eth_getProof',[entry.userOp.sender, [], 'latest'])
        storageMap[entry.userOp.sender.toLowerCase()] = storageHash
      }
      mergeStorageMap(storageMap, validationResult.storageMap)

      senders.add(entry.userOp.sender)
      bundle.push(entry.userOp)
      totalGas = newTotalGas
    }

    return [bundle, storageMap]
  }

  /**
   * submit a bundle.
   * after submitting the bundle, remove all UserOps from the mempool
   * @return SendBundleReturn the transaction and UserOp hashes on successful transaction, or null on failed transaction
 */
  private async sendBundle (userOps: UserOperation[], beneficiary: string, storageMap: StorageMap): Promise<SendBundleReturn> {
    try {
      const feeData = await this.providerService.getFeeData()
      const tx = await this.entryPointContract.populateTransaction.handleOps(userOps, beneficiary, {
        type: 2,
        nonce: await this.providerService.getTransactionCount(),
        gasLimit: 10e6,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? 0,
        maxFeePerGas: feeData.maxFeePerGas ?? 0
      })
      tx.chainId = await this.providerService.getChainId()
      const signedTx = await this.providerService.signTransaction(tx)

      let ret: string
      if (this.txMode === 'conditional') {
        ret = await this.providerService.send('eth_sendRawTransactionConditional', [
          signedTx, { knownAccounts: storageMap }
        ])
        Logger.debug({ret}, 'eth_sendRawTransactionConditional ret=')
      } else {
        // ret = await this.signer.sendTransaction(tx)
        ret = await this.providerService.send('eth_sendRawTransaction', [signedTx])
        Logger.debug({ret}, 'eth_sendRawTransaction ret=')
      }

      // TODO: parse ret, and revert if needed.
      Logger.debug({ret}, 'ret=')
      Logger.debug({length: userOps.length}, 'sent handleOps')

      // hashes are needed for debug rpc only.
      const hashes = await this.getUserOpHashes(userOps)
      return {
        transactionHash: ret,
        userOpHashes: hashes
      } as SendBundleReturn
    } catch (e: any) {
      let parsedError: ErrorDescription
      try {
        parsedError = this.entryPointContract.interface.parseError((e.data?.data ?? e.data))
      } catch (e1) {
        this.checkFatal(e)
        console.warn('Failed handleOps, but non-FailedOp error', e)
        return {
          transactionHash: 'ok',
          userOpHashes: []
        }
      }
      
      // parse Error
      const { opIndex, reason } = parsedError.args
      const userOp = userOps[opIndex]
      const reasonStr: string = reason.toString()
      
      if (reasonStr.startsWith('AA3')) {
        this.reputationManager.crashedHandleOps(getAddr(userOp.paymasterAndData))
      } else if (reasonStr.startsWith('AA2')) {
        this.reputationManager.crashedHandleOps(userOp.sender)
      } else if (reasonStr.startsWith('AA1')) {
        this.reputationManager.crashedHandleOps(getAddr(userOp.initCode))
      } else {
        // TODO: add support to mempoolManager to remove by userOp
        this.mempoolManager.removeUserOp(userOp)
        console.warn(`Failed handleOps sender=${userOp.sender} reason=${reasonStr}`)
      }
      return {
        transactionHash: 'ok',
        userOpHashes: []
      }
    }
  }

  /**
   * determine who should receive the proceedings of the request.
   * if signer balance is too low, send it to signer. otherwise, send to configured beneficiary.
 */
  private async selectBeneficiary (): Promise<string> {
    const currentBalance = await this.providerService.getSignerBalance()
    let beneficiary = this.beneficiary
    // below min-balance redeem to the signer, to keep it active.
    if (currentBalance.lte(this.minSignerBalance)) {
      beneficiary = await this.providerService.getSignerAddress()
      Logger.debug(`low balance. using, ${beneficiary}, as beneficiary instead of , ${this.beneficiary}`)
    }
    return beneficiary
  }

  // fatal errors we know we can't recover
  private checkFatal (e: any): void {
    // console.log('ex entries=',Object.entries(e))
    if (e.error?.code === -32601) {
      throw e
    }
  }

  // TODO: add unit test
  public async getUserOpHashes(userOps: UserOperation[]): Promise<string[]> {
    const getCodeHashesFactory = new ethers.ContractFactory(
      GET_USEROP_HASHES_ABI,
      GET_USEROP_HASHES_BYTECODE
    ) as ContractFactory

    const { userOpHashes } = await this.providerService.runContractScript(
      getCodeHashesFactory,
      [this.entryPointContract.address, userOps]
    )

    return userOpHashes
  }
}
