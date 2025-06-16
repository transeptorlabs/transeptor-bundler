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
  NetworkCallError,
  LogUserOpLifecycleEvent,
} from '../../types/index.js'
import {
  deepHexlify,
  getAuthorizationList,
  unpackUserOp,
  withReadonly,
} from '../../utils/index.js'

import { ProviderService } from '../../provider/index.js'
import { ValidationService } from '../../validation/index.js'
import { EventManager } from '../../event/index.js'
import { PreVerificationGasCalculator } from '../../gas/index.js'
import { Either } from '../../monad/index.js'
import {
  extractCallGasLimit,
  extractUserOpVerificationResult,
  extractVerificationGasLimit,
  getUserOpHashWithCode,
  sendUserOpToMempool,
} from './eth-api.helpers.js'

export type EthAPIConfig = {
  logUserOpLifecycleEvent: LogUserOpLifecycleEvent
  providerService: ProviderService
  sim: Simulator
  validationService: ValidationService
  eventsManager: EventManager
  mempoolManageSender: MempoolManageSender
  preVerificationGasCalculator: PreVerificationGasCalculator
  eip7702Support: boolean
  chainId: number
}

/**
 * Creates an instance of the EthAPI module.
 *
 * @param config - The configuration object for the EthAPI instance.
 * @returns An instance of the EthAPI module.
 */
function _createEthAPI(config: Readonly<EthAPIConfig>): EthAPI {
  const HEX_REGEX = /^0x[a-fA-F\d]*$/i
  const {
    providerService: ps,
    sim,
    validationService: vs,
    eventsManager,
    mempoolManageSender,
    preVerificationGasCalculator: pvgc,
    eip7702Support,
    chainId,
    logUserOpLifecycleEvent,
  } = config
  const entryPoint = ps.getEntryPointContractDetails()

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
        {
          userOpInput: deepHexlify({
            // Override gas params to estimate gas defaults
            maxFeePerGas: 0,
            maxPriorityFeePerGas: 0,
            preVerificationGas: 21000,
            callGasLimit: 10e6,
            verificationGasLimit: 10e6,
            ...userOpInput,
          }),
          entryPointInput,
          entryPointAddress: entryPoint.address,
          eip7702Support,
        },
        true,
        true,
        false,
      )

      return opReady.foldAsync(
        async (error: RpcError) => Either.Left(error),
        async (userOp: UserOperation) => {
          const authorizationList = getAuthorizationList(userOp)

          // Estimate verification gas and call gas
          const [executionResult, callGasLimit] = await Promise.all([
            sim.simulateHandleOp(userOp as UserOperation, stateOverride),
            ps.estimateGas(
              entryPoint.address,
              userOp.sender,
              userOp.callData,
              authorizationList,
            ),
          ])

          return Either.Right<RpcError, EstimateUserOpGasResult>({
            preVerificationGas: 0,
            verificationGasLimit: 0,
            callGasLimit: 0,
          })
            .map((estimate) => ({
              ...estimate,
              preVerificationGas: pvgc.estimatePreVerificationGas(
                {
                  ...userOp,
                  signature: undefined, // ignore signature for gas estimation to allow estimatePreVerificationGas to use dummy signature
                },
                {},
              ),
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
      await logUserOpLifecycleEvent({
        lifecycleStage: 'userOpReceived',
        chainId,
        userOpHash: '0x0',
        entryPoint: entryPoint.address,
        userOp: userOpInput,
      })

      // Validate the input parameters
      const inputValResult = await vs.validateInputParameters(
        {
          userOpInput,
          entryPointInput,
          entryPointAddress: entryPoint.address,
          eip7702Support,
        },
        true,
        true,
        true,
      )

      const parsedInputValRes: {
        userOp: UserOperation
        error?: RpcError
      } = inputValResult.fold(
        (error: RpcError) => {
          return {
            error,
            userOp: undefined,
          }
        },
        (userOp: UserOperation) => {
          return {
            error: undefined,
            userOp,
          }
        },
      )

      if (parsedInputValRes.error) {
        await logUserOpLifecycleEvent({
          lifecycleStage: 'userOpRejected',
          chainId,
          userOpHash: '0x0',
          entryPoint: entryPoint.address,
          userOp: userOpInput,
          details: {
            reason: parsedInputValRes.error.message,
          },
        })
        return Either.Left(parsedInputValRes.error)
      }

      // Get the userOpHash
      const userOp = parsedInputValRes.userOp
      const userOpHashRes = await getUserOpHashWithCode(ps, entryPoint, userOp)
      const parsedUserOpHashRes: {
        userOpHash: string
        error?: NetworkCallError
      } = userOpHashRes.fold(
        (error: NetworkCallError) => {
          return {
            error,
            userOpHash: '0x0',
          }
        },
        (userOpHash: string) => {
          return {
            error: undefined,
            userOpHash,
          }
        },
      )
      if (parsedUserOpHashRes.error) {
        await logUserOpLifecycleEvent({
          lifecycleStage: 'userOpRejected',
          chainId,
          userOpHash: '0x0',
          entryPoint: entryPoint.address,
          userOp: userOpInput,
          details: {
            reason: parsedUserOpHashRes.error.message,
          },
        })
        return Either.Left(
          new RpcError(
            parsedUserOpHashRes.error.message,
            ValidationErrors.InternalError,
          ),
        )
      }

      // Validate the userOp and relay it to the mempool if validation passes
      const validationResult = await vs.validateUserOp(userOp, true, undefined)
      return Either.Right<RpcError, RelayUserOpParam>(undefined)
        .map((op) => ({
          ...op,
          userOp,
          userOpHash: parsedUserOpHashRes.userOpHash,
        }))
        .flatMap((op) => extractUserOpVerificationResult(op, validationResult))
        .foldAsync(
          async (error: RpcError) => {
            await logUserOpLifecycleEvent({
              lifecycleStage: 'userOpRejected',
              chainId,
              userOpHash: parsedUserOpHashRes.userOpHash,
              entryPoint: entryPoint.address,
              userOp: userOpInput,
              details: {
                reason: error.message,
              },
            })
            return Either.Left<RpcError, string>(error)
          },
          async (relayUserOpParam: RelayUserOpParam) =>
            sendUserOpToMempool(
              relayUserOpParam,
              mempoolManageSender.addUserOp,
            ),
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

export const createEthAPI = withReadonly<EthAPIConfig, EthAPI>(_createEthAPI)
