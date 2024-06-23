import { BigNumber, ethers } from 'ethers'
import {
  EstimateUserOpGasResult,
  PackedUserOperation,
  UserOperation,
  UserOperationByHashResponse,
  UserOperationReceipt,
  ValidationErrors,
} from '../../types/index.js'
import {
  deepHexlify,
  requireCond,
  packUserOp,
  unpackUserOp,
  requireAddressAndFields,
  calcPreVerificationGas,
} from '../../utils/index.js'

import { ProviderService } from '../../provider/index.js'
import { resolveProperties } from 'ethers/lib/utils.js'
import { BundleManager } from '../../bundle/index.js'
import { MempoolManager } from '../../mempool/index.js'
import { ValidationService } from '../../validation/index.js'
import { EventsManager } from '../../event/index.js'
import { simulateHandleOp } from '../../entrypoint/index.js'
import { Logger } from '../../logger/index.js'

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

  private async validateParameters(
    userOp1: UserOperation,
    entryPointInput: string,
    requireSignature = true, 
    requireGasParams = true,
  ): Promise<void> {
    requireCond(entryPointInput != null, 'No entryPoint param', ValidationErrors.InvalidFields)

    if (entryPointInput?.toString().toLowerCase() !== this.entryPointContract.address.toLowerCase()) {
      throw new Error(`The EntryPoint at "${entryPointInput}" is not supported. This bundler uses ${this.entryPointContract.address}`)
    }
    // minimal sanity check: userOp exists, and all members are hex
    requireCond(userOp1 != null, 'No UserOperation param')
    const userOp = await resolveProperties(userOp1) as any

    const fields = ['sender', 'nonce', 'callData']
    if (requireSignature) {
      fields.push('signature')
    }
    if (requireGasParams) {
      fields.push('preVerificationGas', 'verificationGasLimit', 'callGasLimit', 'maxFeePerGas', 'maxPriorityFeePerGas')
    }
    fields.forEach(key => {
      requireCond(userOp[key] != null, 'Missing userOp field: ' + key, ValidationErrors.InvalidFields, userOp)
      const value: string = userOp[key].toString()
      requireCond(value.match(this.HEX_REGEX) != null, `Invalid hex value for property ${key} in UserOp`, ValidationErrors.InvalidFields, userOp[key])
    })

    requireAddressAndFields(userOp, 'paymaster', ['paymasterPostOpGasLimit', 'paymasterVerificationGasLimit'], ['paymasterData'])
    requireAddressAndFields(userOp, 'factory', ['factoryData'])
  }

  /*
    Estimate the gas values for a UserOperation. Given UserOperation optionally without gas limits and gas prices, return the needed gas limits. The signature field is ignored by the wallet, so that the operation will not require user’s approval. 
    Still, it might require putting a “semi-valid” signature (e.g. a signature in the right length)
      * gas limits (and prices) parameters are optional, but are used if specified. maxFeePerGas and maxPriorityFeePerGas default to zero, so no payment is required by neither account nor paymaster.
      * Optionally accepts the State Override Set to allow users to modify the state during the gas estimation. This field as well as its behavior is equivalent to the ones defined for eth_call RPC method.
  */
  public async estimateUserOperationGas (userOpInput: Partial<UserOperation>, entryPointInput: string): Promise<EstimateUserOpGasResult> {
    const userOp = {
      // Override gas params to estimate gas defaults
      maxFeePerGas: BigNumber.from(0).toHexString(),
      maxPriorityFeePerGas: BigNumber.from(0).toHexString(),
      preVerificationGas: BigNumber.from(0).toHexString(),
      verificationGasLimit:  BigNumber.from(10e6).toHexString(),
      callGasLimit:  BigNumber.from(10e6).toHexString(),
      ...userOpInput,
    }
    await this.validateParameters(deepHexlify(userOp), entryPointInput)
    const {
      preOpGas,
      validAfter,
      validUntil,
     } = await simulateHandleOp(this.entryPointContract.address, this.providerService, userOp as UserOperation)

    // TODO: Use simulateHandleOp with proxy contract to estimate callGasLimit too
    const callGasLimit = await this.providerService.estimateGas(this.entryPointContract.address, userOp.sender, userOp.callData)
    const verificationGasLimit = BigNumber.from(preOpGas).toNumber()
    const preVerificationGas = calcPreVerificationGas(userOp)

    return {
      validAfter,
      validUntil,
      preVerificationGas,
      verificationGasLimit,
      callGasLimit
      // TODO: Add paymaster gas values
      // paymasterVerificationGasLimit,
      // paymasterPostOpGasLimit,
    }
  }

  public async sendUserOperation(userOp: UserOperation, entryPointInput: string) {
    Logger.debug('Running checks on userOp')
    // TODO: This looks like a duplicate of the userOp validateParameters function
    await this.validateParameters(userOp, entryPointInput)
    const userOpReady = await resolveProperties(userOp)
    this.validationService.validateInputParameters(userOp, entryPointInput)
    const validationResult = await this.validationService.validateUserOp(userOp, undefined)

    const userOpHash = await this.entryPointContract.getUserOpHash(packUserOp(userOpReady))

    await this.mempoolManager.addUserOp(
      userOp,
      userOpHash,
      validationResult.returnInfo.prefund,
      validationResult.referencedContracts,
      validationResult.senderInfo,
      validationResult.paymasterInfo,
      validationResult.factoryInfo,
      validationResult.aggregatorInfo
    )

    // TODO: This code is blocking request since the userOp is added to the mempool. Offload to a separate process to avoid blocking
    if (this.mempoolManager.isMempoolOverloaded()) {
      await this.bundleManager.doAttemptAutoBundle(true)
    }

    return userOpHash
  }

  public getSupportedEntryPoints(): string[] {
    return [this.entryPointContract.address]
  }

  public async getUserOperationReceipt(userOpHash: string): Promise<UserOperationReceipt | null> {
    requireCond(userOpHash?.toString()?.match(this.HEX_REGEX) != null, 'Missing/invalid userOpHash', ValidationErrors.InvalidFields)
    const event = await this.eventsManager.getUserOperationEvent(userOpHash)
    if (event == null) {
      return null
    }
    const receipt = await event.getTransactionReceipt()
    const logs = this.eventsManager.filterLogs(event, receipt.logs)
    return deepHexlify({
      userOpHash,
      sender: event.args.sender,
      nonce: event.args.nonce,
      actualGasCost: event.args.actualGasCost,
      actualGasUsed: event.args.actualGasUsed,
      success: event.args.success,
      logs,
      receipt
    })
  }

  public async getUserOperationByHash(userOpHash: string): Promise<UserOperationByHashResponse | null> {
    requireCond(userOpHash?.toString()?.match(this.HEX_REGEX) != null, 'Missing/invalid userOpHash', ValidationErrors.InvalidFields)
    const event = await this.eventsManager.getUserOperationEvent(userOpHash)
    if (event == null) {
      return null
    }
    const tx = await event.getTransaction()
    if (tx.to !== this.entryPointContract.address) {
      throw new Error('unable to parse transaction')
    }

    const parsed = this.entryPointContract.interface.parseTransaction(tx)
    const ops: PackedUserOperation[] = parsed?.args.ops
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

    return deepHexlify({
      userOperation: unpackUserOp(op),
      entryPoint: this.entryPointContract.address,
      transactionHash: tx.hash,
      blockHash: tx.blockHash ?? '',
      blockNumber: tx.blockNumber ?? 0
    })
  }
}

