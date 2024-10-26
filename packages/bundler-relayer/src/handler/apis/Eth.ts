import { BigNumber, ethers } from 'ethers'
import {
  EstimateUserOpGasResult,
  PackedUserOperation,
  RelayUserOpParam,
  UserOperation,
  UserOperationByHashResponse,
  UserOperationReceipt,
} from '../../../../shared/types/index.js'
import { ValidationErrors } from '../../../../shared/validatation/index.js'
import {
  deepHexlify,
  requireCond,
  packUserOp,
  unpackUserOp,
  requireAddressAndFields,
  calcPreVerificationGas,
  RpcError,
} from '../../../../shared/utils/index.js'

import { ProviderService } from '../../../../shared/provider/index.js'
import { resolveProperties } from 'ethers/lib/utils.js'
import { Simulator } from '../../../../shared/sim/index.js'
import { Logger } from '../../../../shared/logger/index.js'
import { ValidationService } from '../../../../shared/validatation/index.js'
import { routeRequest } from '../request-router.js'
import { CommonEventManager } from '../../event/index.js'

const HEX_REGEX = /^0x[a-fA-F\d]*$/i

const validateParameters = async (
  userOp1: UserOperation,
  entryPointInput: string,
  entryPointContract: ethers.Contract,
  requireSignature = true,
  requireGasParams = true,
): Promise<void> => {
  requireCond(
    entryPointInput != null,
    'No entryPoint param',
    ValidationErrors.InvalidFields,
  )

  if (
    entryPointInput?.toString().toLowerCase() !==
    entryPointContract.address.toLowerCase()
  ) {
    throw new Error(
      `The EntryPoint at "${entryPointInput}" is not supported. This bundler uses ${entryPointContract.address}`,
    )
  }
  // minimal sanity check: userOp exists, and all members are hex
  requireCond(
    userOp1 != null,
    'No UserOperation param',
    ValidationErrors.InvalidFields,
  )
  const userOp = (await resolveProperties(userOp1)) as any

  const fields = ['sender', 'nonce', 'callData']
  if (requireSignature) {
    fields.push('signature')
  }
  if (requireGasParams) {
    fields.push(
      'preVerificationGas',
      'verificationGasLimit',
      'callGasLimit',
      'maxFeePerGas',
      'maxPriorityFeePerGas',
    )
  }
  fields.forEach((key) => {
    requireCond(
      userOp[key] != null,
      'Missing userOp field: ' + key,
      ValidationErrors.InvalidFields,
      userOp,
    )
    const value: string = userOp[key].toString()
    requireCond(
      value.match(HEX_REGEX) != null,
      `Invalid hex value for property ${key} in UserOp`,
      ValidationErrors.InvalidFields,
      userOp[key],
    )
  })

  requireAddressAndFields(
    userOp,
    'paymaster',
    ['paymasterPostOpGasLimit', 'paymasterVerificationGasLimit'],
    ['paymasterData'],
  )
  requireAddressAndFields(userOp, 'factory', ['factoryData'])
}

export type EthAPI = {
  estimateUserOperationGas(
    userOpInput: Partial<UserOperation>,
    entryPointInput: string,
  ): Promise<EstimateUserOpGasResult>
  sendUserOperation(
    userOp: UserOperation,
    entryPointInput: string,
  ): Promise<string>
  getSupportedEntryPoints(): string[]
  getUserOperationReceipt(
    userOpHash: string,
  ): Promise<UserOperationReceipt | null>
  getUserOperationByHash(
    userOpHash: string,
  ): Promise<UserOperationByHashResponse | null>
}

export const createEthAPI = (
  ps: ProviderService,
  sim: Simulator,
  vs: ValidationService,
  commonEventsManager: CommonEventManager,
  entryPointContract: ethers.Contract,
  bundlerBuilderClientUrl: string,
  isUnsafeMode: boolean,
): EthAPI => {
  return {
    /*
      Estimate the gas values for a UserOperation. Given UserOperation optionally without gas limits and gas prices, return the needed gas limits. The signature field is ignored by the wallet, so that the operation will not require user’s approval. 
      Still, it might require putting a “semi-valid” signature (e.g. a signature in the right length)
        * gas limits (and prices) parameters are optional, but are used if specified. maxFeePerGas and maxPriorityFeePerGas default to zero, so no payment is required by neither account nor paymaster.
        * Optionally accepts the State Override Set to allow users to modify the state during the gas estimation. This field as well as its behavior is equivalent to the ones defined for eth_call RPC method.
    */
    estimateUserOperationGas: async (
      userOpInput: Partial<UserOperation>,
      entryPointInput: string,
    ): Promise<EstimateUserOpGasResult> => {
      const userOp = {
        // Override gas params to estimate gas defaults
        maxFeePerGas: BigNumber.from(0).toHexString(),
        maxPriorityFeePerGas: BigNumber.from(0).toHexString(),
        preVerificationGas: BigNumber.from(0).toHexString(),
        verificationGasLimit: BigNumber.from(10e6).toHexString(),
        callGasLimit: BigNumber.from(10e6).toHexString(),
        ...userOpInput,
      }
      await validateParameters(
        deepHexlify(userOp),
        entryPointInput,
        entryPointContract,
      )
      const { preOpGas, validAfter, validUntil } = await sim.simulateHandleOp(
        userOp as UserOperation,
      )

      // TODO: Use simulateHandleOp with proxy contract to estimate callGasLimit too
      const callGasLimit = await ps.estimateGas(
        entryPointContract.address,
        userOp.sender,
        userOp.callData,
      )
      const verificationGasLimit = BigNumber.from(preOpGas).toNumber()
      const preVerificationGas = calcPreVerificationGas(userOp)

      return {
        validAfter,
        validUntil,
        preVerificationGas,
        verificationGasLimit,
        callGasLimit,
        // TODO: Add paymaster gas values
        // paymasterVerificationGasLimit,
        // paymasterPostOpGasLimit,
      }
    },

    sendUserOperation: async (
      userOp: UserOperation,
      entryPointInput: string,
    ): Promise<string> => {
      Logger.debug('Running checks on userOp')
      // TODO: This looks like a duplicate of the userOp validateParameters function
      await validateParameters(userOp, entryPointInput, entryPointContract)
      const userOpReady = await resolveProperties(userOp)
      vs.validateInputParameters(userOp, entryPointInput, true, true)
      const validationResult = await vs.validateUserOp(
        userOp,
        isUnsafeMode,
        true,
        undefined,
      )

      const userOpHash = await entryPointContract.getUserOpHash(
        packUserOp(userOpReady),
      )
      const relayedOp: RelayUserOpParam = {
        userOp,
        userOpHash,
        prefund: validationResult.returnInfo.prefund,
        referencedContracts: validationResult.referencedContracts,
        senderInfo: validationResult.senderInfo,
        paymasterInfo: validationResult.paymasterInfo,
        factoryInfo: validationResult.factoryInfo,
        aggregatorInfo: validationResult.aggregatorInfo,
      }

      Logger.debug(
        `Sending userOp to bundler-builder node... at ${bundlerBuilderClientUrl}`,
      )
      const res: string | RpcError = await routeRequest<string>(
        bundlerBuilderClientUrl,
        'builder_addUserOp',
        [relayedOp],
      )

      if (res instanceof RpcError) {
        requireCond(false, res.message, res.code)
      }

      Logger.debug(res, 'UserOp included in mempool...')

      return userOpHash
    },

    getSupportedEntryPoints(): string[] {
      return [entryPointContract.address]
    },

    getUserOperationReceipt: async (
      userOpHash: string,
    ): Promise<UserOperationReceipt | null> => {
      requireCond(
        userOpHash?.toString()?.match(HEX_REGEX) != null,
        'Missing/invalid userOpHash',
        ValidationErrors.InvalidFields,
      )
      const event = await commonEventsManager.getUserOperationEvent(userOpHash)
      if (event == null) {
        return null
      }
      const receipt = await event.getTransactionReceipt()
      const logs = commonEventsManager.filterLogs(event, receipt.logs)
      return deepHexlify({
        userOpHash,
        sender: event.args.sender,
        nonce: event.args.nonce,
        actualGasCost: event.args.actualGasCost,
        actualGasUsed: event.args.actualGasUsed,
        success: event.args.success,
        logs,
        receipt,
      })
    },

    getUserOperationByHash: async (
      userOpHash: string,
    ): Promise<UserOperationByHashResponse | null> => {
      requireCond(
        userOpHash?.toString()?.match(HEX_REGEX) != null,
        'Missing/invalid userOpHash',
        ValidationErrors.InvalidFields,
      )

      // TODO: First check if the userOp is pending in the mempool
      // if so the UserOperation is pending in the bundler’s mempool:
      // MAY return null, or: a full UserOperation, with the addition of the entryPoint field and a null value for blockNumber, blockHash and transactionHash.
      const event = await commonEventsManager.getUserOperationEvent(userOpHash)
      if (event == null) {
        return null
      }
      const tx = await event.getTransaction()
      if (tx.to !== entryPointContract.address) {
        throw new Error('unable to parse transaction')
      }

      const parsed = entryPointContract.interface.parseTransaction(tx)
      const ops: PackedUserOperation[] = parsed?.args.ops
      if (ops == null) {
        throw new Error('failed to parse transaction')
      }

      const op = ops.find(
        (op) =>
          op.sender === event.args?.sender &&
          BigNumber.from(op.nonce).eq(event.args?.nonce),
      )
      if (op == null) {
        throw new Error('unable to find userOp in transaction')
      }

      return deepHexlify({
        userOperation: unpackUserOp(op),
        entryPoint: entryPointContract.address,
        transactionHash: tx.hash,
        blockHash: tx.blockHash ?? '',
        blockNumber: tx.blockNumber ?? 0,
      })
    },
  }
}
