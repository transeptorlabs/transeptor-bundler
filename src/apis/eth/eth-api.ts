import { ethers } from 'ethers'
import {
  EstimateUserOpGasResult,
  PackedUserOperation,
  RelayUserOpParam,
  UserOperation,
  UserOperationByHashResponse,
  UserOperationReceipt,
  MempoolManageSender,
  ValidationErrors,
  StateOverride,
  RpcError,
  EthAPI,
  Simulator,
} from '../../types/index.js'
import { deepHexlify, packUserOp, unpackUserOp } from '../../utils/index.js'

import { ProviderService } from '../../provider/index.js'
import { ValidationService } from '../../validation/index.js'
import { EventManagerWithListener } from '../../event/index.js'
import { PreVerificationGasCalculator } from '../../gas/index.js'
import { Either } from '../../monad/index.js'
import {
  extractCallGasLimit,
  extractUseropVerificationResult,
  extractVerificationGasLimit,
  sendUserOpToMempool,
} from './eth-api.helpers.js'

export type EthAPIConfig = {
  ps: ProviderService
  sim: Simulator
  vs: ValidationService
  eventsManager: EventManagerWithListener
  mempoolManageSender: MempoolManageSender
  pvgc: PreVerificationGasCalculator
  entryPoint: {
    contract: ethers.Contract
    address: string
  }
}

export const createEthAPI = (config: EthAPIConfig): EthAPI => {
  const HEX_REGEX = /^0x[a-fA-F\d]*$/i
  const { ps, sim, vs, eventsManager, mempoolManageSender, pvgc, entryPoint } =
    config

  return {
    getChainId: async (): Promise<number> => ps.getChainId(),
    /*
      Estimate the gas values for a UserOperation. Given UserOperation optionally without gas limits and gas prices, return the needed gas limits. The signature field is ignored by the wallet, so that the operation will not require user's approval. 
      Still, it might require putting a "semi-valid" signature (e.g. a signature in the right length)
        * gas limits (and prices) parameters are optional, but are used if specified. maxFeePerGas and maxPriorityFeePerGas default to zero, so no payment is required by neither account nor paymaster.
        * Optionally accepts the State Override Set to allow users to modify the state during the gas estimation. This field as well as its behavior is equivalent to the ones defined for eth_call RPC method.
    */
    estimateUserOperationGas: async (
      userOpInput: Partial<UserOperation>,
      entryPointInput: string,
      stateOverride?: StateOverride,
    ): Promise<Either<RpcError, EstimateUserOpGasResult>> => {
      const opReady = await vs.validateInputParameters(
        deepHexlify({
          // Override gas params to estimate gas defaults
          maxFeePerGas: 0,
          maxPriorityFeePerGas: 0,
          preVerificationGas: 21000,
          callGasLimit: 10e6,
          verificationGasLimit: 10e6,
          ...userOpInput,
        }),
        entryPointInput,
        entryPoint.address,
        true,
        true,
        false,
      )

      return opReady.foldAsync(
        async (error: RpcError) => Either.Left(error),
        async (userOp: UserOperation) => {
          // Estimate verification gas and call gas
          const [executionResult, callGasLimit] = await Promise.all([
            sim.simulateHandleOp(userOp as UserOperation, stateOverride),
            ps.estimateGas(entryPoint.address, userOp.sender, userOp.callData),
          ])

          // Estimate the pre-verification gas
          const preVerificationGas = pvgc.calcPreVerificationGas({
            ...userOp,
            signature: undefined, // ignore signature for gas estimation to allow calcPreVerificationGas to use dummy signature
          })

          return Either.Right<RpcError, EstimateUserOpGasResult>({
            preVerificationGas: 0,
            verificationGasLimit: 0,
            callGasLimit: 0,
          })
            .map((estimate) => ({
              ...estimate,
              preVerificationGas,
            }))
            .flatMap((estimate) => extractCallGasLimit(estimate, callGasLimit))
            .flatMap((estimate) =>
              extractVerificationGasLimit(estimate, executionResult),
            )
        },
      )
    },

    sendUserOperation: async (
      userOpInput: UserOperation,
      entryPointInput: string,
    ): Promise<Either<RpcError, string>> => {
      const opReady = await vs.validateInputParameters(
        userOpInput,
        entryPointInput,
        entryPoint.address,
        true,
        true,
        true,
      )

      return opReady.foldAsync(
        async (error: RpcError) => Either.Left(error),
        async (userOp: UserOperation) => {
          const [validationResult, userOpHash] = await Promise.all([
            vs.validateUserOp(userOp, true, undefined),
            entryPoint.contract.getUserOpHash(packUserOp(userOp)),
          ])

          return Either.Right<RpcError, RelayUserOpParam>(undefined)
            .map((op) => ({
              ...op,
              userOp,
            }))
            .map((op) => ({
              ...op,
              userOpHash,
            }))
            .flatMap((op) =>
              extractUseropVerificationResult(op, validationResult),
            )
            .foldAsync(
              async (error: RpcError) => Either.Left<RpcError, string>(error),
              async (relayUserOpParam: RelayUserOpParam) =>
                sendUserOpToMempool(
                  relayUserOpParam,
                  mempoolManageSender.addUserOp,
                ),
            )
        },
      )
    },

    getSupportedEntryPoints: async (): Promise<string[]> => {
      return [entryPoint.address]
    },

    getUserOperationReceipt: async (
      userOpHash: string,
    ): Promise<Either<RpcError, UserOperationReceipt | null>> => {
      if (!(userOpHash?.toString()?.match(HEX_REGEX) != null)) {
        return Either.Left(
          new RpcError(
            'Missing/invalid userOpHash',
            ValidationErrors.InvalidFields,
          ),
        )
      }

      const event = await eventsManager.getUserOperationEvent(userOpHash)
      if (event == null) {
        return Either.Right(null)
      }

      const receipt = await event.getTransactionReceipt()
      return eventsManager.filterLogs(event, receipt.logs).foldAsync(
        async (error: Error) =>
          Either.Left(new RpcError(error.message, -32000)),
        async (logs) => {
          const confirmations = await receipt.confirmations()
          return Either.Right({
            userOpHash,
            sender: event.args.sender,
            nonce: event.args.nonce,
            actualGasCost: event.args.actualGasCost,
            actualGasUsed: event.args.actualGasUsed,
            success: event.args.success,
            logs,
            receipt: {
              to: receipt.to,
              from: receipt.from,
              contractAddress: receipt.contractAddress,
              transactionIndex: receipt.index,
              root: receipt.root,
              gasUsed: receipt.gasUsed,
              logsBloom: receipt.logsBloom,
              blockHash: receipt.blockHash,
              transactionHash: receipt.hash,
              logs: receipt.logs,
              blockNumber: receipt.blockNumber,
              confirmations,
              cumulativeGasUsed: receipt.cumulativeGasUsed,
              effectiveGasPrice: receipt.gasPrice,
              type: receipt.type,
              status: receipt.status,
            },
          })
        },
      )
    },

    getUserOperationByHash: async (
      userOpHash: string,
    ): Promise<Either<RpcError, UserOperationByHashResponse | null>> => {
      if (!(userOpHash?.toString()?.match(HEX_REGEX) != null)) {
        return Either.Left(
          new RpcError(
            'Missing/invalid userOpHash',
            ValidationErrors.InvalidFields,
          ),
        )
      }

      // TODO: First check if the userOp is pending in the mempool
      // if so the UserOperation is pending in the bundler's mempool:
      // MAY return null, or: a full UserOperation, with the addition of the entryPoint field and a null value for blockNumber, blockHash and transactionHash.
      const event = await eventsManager.getUserOperationEvent(userOpHash)
      if (event == null) {
        return Either.Right(null)
      }
      const tx = await event.getTransaction()
      if (tx.to !== entryPoint.address) {
        return Either.Left(new RpcError('unable to parse transaction', -32000))
      }

      const parsed = entryPoint.contract.interface.parseTransaction(tx)
      const ops: PackedUserOperation[] = parsed?.args.ops
      if (ops == null) {
        return Either.Left(new RpcError('unable to parse transaction', -32000))
      }

      const op = ops.find(
        (op) =>
          op.sender === event.args?.sender &&
          BigInt(op.nonce) === BigInt(event.args?.nonce),
      )
      if (op == null) {
        return Either.Left(
          new RpcError('unable to find userOp in transaction', -32000),
        )
      }

      return Either.Right({
        userOperation: unpackUserOp(op),
        entryPoint: entryPoint.address,
        transactionHash: tx.hash,
        blockHash: tx.blockHash ?? '',
        blockNumber: tx.blockNumber ?? 0,
      } as UserOperationByHashResponse)
    },
  }
}
