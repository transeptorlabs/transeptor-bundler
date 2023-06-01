import { BigNumber, ethers } from 'ethers'
import { UserOperation, UserOperationByHashResponse, UserOperationReceipt } from '../../types'
import { Logger } from '../../logger'
import { getAddr, requireCond, tostr } from '../../utils'
import { ProviderService } from '../../provider'
import { resolveProperties } from 'ethers/lib/utils'
import { BundleManager } from '../../bundle'
import { MempoolManager } from '../../mempool'
import { ValidationService } from '../../validation'
import { EventsManager } from '../../event'

export class EthAPI {
  private readonly entryPointContract: ethers.Contract
  private readonly providerService: ProviderService
  private readonly bundleManager: BundleManager
  private readonly validationService: ValidationService
  private readonly mempoolManager: MempoolManager
  private readonly eventsManager: EventsManager
  private readonly HEX_REGEX = /^0x[a-fA-F\d]*$/i

  constructor(
    entryPointContract: ethers.Contract,
    providerService: ProviderService,
    bundleManager: BundleManager,
    validationService: ValidationService,
    mempoolManager: MempoolManager,
    eventsManager: EventsManager
  ) {
    this.entryPointContract = entryPointContract
    this.providerService = providerService
    this.bundleManager = bundleManager
    this.validationService = validationService
    this.mempoolManager = mempoolManager
    this.eventsManager = eventsManager
  }

  public async sendUserOperation(userOp: UserOperation, supportedEntryPoints: string) {
    await this.validateParameters(userOp, supportedEntryPoints)
    const userOpReady = await resolveProperties(userOp)

    Logger.debug(
      {
        sender: userOpReady.sender,
        nonce: tostr(userOpReady.nonce),
        entryPoint: supportedEntryPoints,
        paymaster: getAddr(userOpReady.paymasterAndData),
      },
      'send UserOperation'
    )

    const callData = this.entryPointContract.interface.encodeFunctionData(
      'getUserOpHash',
      [userOpReady]
    )
    const result = await this.providerService.call(
      this.entryPointContract.address,
      callData
    )
    const userOpHash = this.entryPointContract.interface.decodeFunctionResult(
      'getUserOpHash',
      result
    )[0] as string

    Logger.debug('first validation and sendUserOperation to mempool')
    const validationResult = await this.validationService.validateUserOp(
      userOp,
      undefined
    )

    await this.mempoolManager.addUserOp(
      userOp,
      userOpHash,
      validationResult.returnInfo.prefund,
      validationResult.senderInfo,
      validationResult.referencedContracts,
      validationResult.aggregatorInfo?.addr
    )

    if (this.mempoolManager.isMempoolOverloaded()) {
      await this.bundleManager.doAttemptAutoBundle(true)
    }

    return userOpHash
  }

  public getSupportedEntryPoints(): string[] {
    return [this.entryPointContract.address]
  }

  public async getUserOperationReceipt (userOpHash: string): Promise<UserOperationReceipt | null> {
    requireCond(userOpHash?.toString()?.match(this.HEX_REGEX) != null, 'Missing/invalid userOpHash', -32601)
    const event = await this.eventsManager.getUserOperationEvent(userOpHash)
    if (event == null) {
      return null
    }
    const receipt = await event.getTransactionReceipt()
    const logs = this.eventsManager.filterLogs(event, receipt.logs)
    return {
      userOpHash,
      sender: event.args?.sender,
      nonce: event.args?.nonce,
      actualGasCost: event.args?.actualGasCost,
      actualGasUsed: event.args?.actualGasUsed,
      success: event.args?.success,
      logs,
      receipt
    }
  }

  async getUserOperationByHash (userOpHash: string): Promise<UserOperationByHashResponse | null> {
    requireCond(userOpHash?.toString()?.match(this.HEX_REGEX) != null, 'Missing/invalid userOpHash', -32601)
    const event = await this.eventsManager.getUserOperationEvent(userOpHash)
    if (event == null) {
      return null
    }
    const tx = await event.getTransaction()
    if (tx.to !== this.entryPointContract.address) {
      throw new Error('unable to parse transaction')
    }

    const parsed = this.entryPointContract.interface.parseTransaction(tx)
    const ops: UserOperation[] = parsed?.args.ops
    if (ops == null) {
      throw new Error('failed to parse transaction')
    }
    
    const op = ops.find(op =>
      op.sender === event.args?.sender &&
      BigNumber.from(op.nonce).eq(event.args?.nonce)
    )
    if (op == null) {
      throw new Error('unable to find userOp in transaction')
    }

    const {
      sender,
      nonce,
      initCode,
      callData,
      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      paymasterAndData,
      signature
    } = op

    return {
      userOperation: {
        sender,
        nonce,
        initCode,
        callData,
        callGasLimit,
        verificationGasLimit,
        preVerificationGas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        paymasterAndData,
        signature
      },
      entryPoint: this.entryPointContract.address,
      transactionHash: tx.hash,
      blockHash: tx.blockHash ?? '',
      blockNumber: tx.blockNumber ?? 0
    }
  }

  private async validateParameters(
    userOp1: UserOperation,
    entryPointInput: string
  ): Promise<void> {
    requireCond(entryPointInput != null, 'No entryPoint param', -32602)

    if (
      entryPointInput?.toString().toLowerCase() !==
      this.entryPointContract.address.toLowerCase()
    ) {
      throw new Error(
        `The EntryPoint at "${entryPointInput}" is not supported. This bundler uses ${this.entryPointContract.address}`
      )
    }
    // minimal sanity check: userOp exists, and all members are hex
    requireCond(userOp1 != null, 'No UserOperation param')
    const userOp = (await resolveProperties(userOp1)) as any

    const fields = [
      'sender',
      'nonce',
      'initCode',
      'callData',
      'paymasterAndData',
      'signature',
      'preVerificationGas',
      'verificationGasLimit',
      'callGasLimit',
      'maxFeePerGas',
      'maxPriorityFeePerGas',
    ]

    fields.forEach((key) => {
      requireCond(
        userOp[key] != null,
        'Missing userOp field: ' + key + JSON.stringify(userOp),
        -32602
      )
      const value: string = userOp[key].toString()
      requireCond(
        value.match(this.HEX_REGEX) != null,
        `Invalid hex value for property ${key}:${value} in UserOp`,
        -32602
      )
    })
  }
}

