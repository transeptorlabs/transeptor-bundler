import { BigNumber, ethers } from 'ethers'
import { EstimateUserOpGasResult, UserOperation, UserOperationByHashResponse, UserOperationReceipt, ValidationErrors } from 'types'
import { Logger } from 'logger'
import { RpcError, deepHexlify, getAddr, requireCond, tostr } from 'utils'
import { ProviderService } from 'provider'
import { resolveProperties } from 'ethers/lib/utils'
import { BundleManager } from 'bundle'
import { MempoolManager } from 'mempool'
import { ValidationService } from 'validation'
import { EventsManager } from 'event'
import { calcPreVerificationGas } from '@account-abstraction/sdk'

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
    this.validationService.validateInputParameters(userOp, supportedEntryPoints)
    const validationResult = await this.validationService.validateUserOp(userOp, undefined)
    const userOpHash = await this.entryPointContract.getUserOpHash(userOpReady)

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

  public async getUserOperationReceipt(userOpHash: string): Promise<UserOperationReceipt | null> {
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

  public async getUserOperationByHash(userOpHash: string): Promise<UserOperationByHashResponse | null> {
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

    return deepHexlify({
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
    })
  }

  public async estimateUserOperationGas (userOp1: UserOperation, entryPointInput: string): Promise<EstimateUserOpGasResult> {
    const userOp = {
      // default values for missing fields.
      paymasterAndData: '0x',
      maxFeePerGas: 0,
      maxPriorityFeePerGas: 0,
      preVerificationGas: 0,
      verificationGasLimit: 10e6,
      ...await resolveProperties(userOp1),
    }

    // todo: checks the existence of parameters, but since we hexlify the inputs, it fails to validate
    await this.validateParameters(deepHexlify(userOp), entryPointInput)

    const errorResult = await this.entryPointContract.callStatic.simulateValidation(userOp).catch(e => e)
    if (errorResult.errorName === 'FailedOp') {
      throw new RpcError(errorResult.errorArgs.at(-1), ValidationErrors.SimulateValidation)
    }

    if (errorResult.errorName !== 'ValidationResult') {
      throw errorResult
    }

    const { returnInfo } = errorResult.errorArgs
    let {
      preOpGas,
      validAfter,
      validUntil
    } = returnInfo

    const callGasLimit = await this.providerService.estimateGas(this.entryPointContract.address, userOp.sender, userOp.callData)
    validAfter = BigNumber.from(validAfter)
    validUntil = BigNumber.from(validUntil)
    preOpGas = BigNumber.from(preOpGas)
    if (validUntil === BigNumber.from(0)) {
      validUntil = undefined
    }
    if (validAfter === BigNumber.from(0)) {
      validAfter = undefined
    }

    const preVerificationGas = calcPreVerificationGas(userOp)
    const verificationGasLimit = BigNumber.from(preOpGas).toNumber()
    return {
      preVerificationGas,
      verificationGasLimit,
      validAfter,
      validUntil,
      callGasLimit
    }
  }

  private async validateParameters(
    userOp1: UserOperation,
    entryPointInput: string,
    requireSignature = true, 
    requireGasParams = true
  ): Promise<void> {
    requireCond(entryPointInput != null, 'No entryPoint param', -32602)

    if (entryPointInput?.toString().toLowerCase() !== this.entryPointContract.address.toLowerCase()) {
      throw new Error(`The EntryPoint at "${entryPointInput}" is not supported. This bundler uses ${this.entryPointContract.address}`)
    }
    // minimal sanity check: userOp exists, and all members are hex
    requireCond(userOp1 != null, 'No UserOperation param')
    const userOp = await resolveProperties(userOp1) as any

    const fields = ['sender', 'nonce', 'initCode', 'callData', 'paymasterAndData']
    if (requireSignature) {
      fields.push('signature')
    }
    if (requireGasParams) {
      fields.push('preVerificationGas', 'verificationGasLimit', 'callGasLimit', 'maxFeePerGas', 'maxPriorityFeePerGas')
    }
    fields.forEach(key => {
      requireCond(userOp[key] != null, 'Missing userOp field: ' + key + JSON.stringify(userOp), -32602)
      const value: string = userOp[key].toString()
      requireCond(value.match(this.HEX_REGEX) != null, `Invalid hex value for property ${key}:${value} in UserOp`, -32602)
    })
  }
}

