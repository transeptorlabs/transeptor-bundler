import {
  ContractFactory,
  ethers,
  JsonRpcProvider,
  Network,
  Result,
  TransactionReceipt,
  FeeData,
  TransactionRequest,
  resolveProperties,
  BytesLike,
  hexlify,
} from 'ethers'

import { Logger } from '../logger/index.js'
import { TraceOptions, TraceResult } from '../sim/index.js'
import { ValidationErrors } from '../validatation/index.js'
import { RpcError } from '../utils/index.js'
import {
  FlashbotsBundleProvider,
  FlashbotsTransaction,
} from '@flashbots/ethers-provider-bundle'

export type ProviderService = {
  getNetwork(): Promise<Network>
  checkContractDeployment(contractAddress: string): Promise<boolean>
  clientVerion(): Promise<string>
  getChainId(): Promise<number>
  getBlockNumber(): Promise<number>
  getFeeData(): Promise<FeeData>
  estimateGas(from: string, to: string, data: BytesLike): Promise<number>
  send(method: string, params: any[]): Promise<any>
  call(contractAddress: string, data: string): Promise<any>
  debug_traceCall(
    tx: TransactionRequest,
    options: TraceOptions,
    useNativeTracerProvider?: boolean,
  ): Promise<TraceResult | any>
  debug_traceTransaction(
    hash: string,
    options: TraceOptions,
  ): Promise<TraceResult | any>
  runContractScript<T extends ContractFactory>(
    c: T,
    ctrParams: Parameters<T['getDeployTransaction']>,
  ): Promise<Result>
  getTransactionReceipt(txHash: string): Promise<TransactionReceipt>
  getSupportedNetworks(): number[]
  isNativeTracerAndNetworkProviderChainMatch(): Promise<boolean>
  sendBundleFlashbots(
    signer: ethers.Wallet,
    transaction: TransactionRequest,
  ): Promise<FlashbotsTransaction>
  getBalance(address: string): Promise<bigint>
}

export const createProviderService = (
  networkProvider: JsonRpcProvider,
  nativeTracerProvider: JsonRpcProvider | undefined,
): ProviderService => {
  /**
   * Note that the contract deployment will cost gas, so it is not free to run this function.
   * Run the constructor of the given type as a script: it is expected to revert with the script's return values.
   *
   * @param c - Contract factory of the script class.
   * @param ctrParams Constructor parameters.
   * @returns An array of arguments of the error.
   *
   * @example
   * const hashes = await doRunContractScript(provider, new GetUserOpHashes__factory(), [entryPoint.address, userOps]).then(ret => ret.userOpHashes)
   */
  const doRunContractScript = async <T extends ContractFactory>(
    c: T,
    ctrParams: Parameters<T['getDeployTransaction']>,
  ): Promise<Result> => {
    try {
      const tx = await c.getDeployTransaction(...ctrParams)
      await networkProvider.call(tx)
    } catch (err: any) {
      if (!err.data) {
        throw new RpcError(
          'unable to extract parse script (error) response missing data: ' +
            err,
          ValidationErrors.InternalError,
        )
      }

      const parsed = c.interface.parseError(err.data)
      if (parsed == null) {
        throw new RpcError(
          'unable to parse script (error) response: ' + err,
          ValidationErrors.InternalError,
        )
      }
      return parsed.args
    }
  }

  const FLASHBOTS_BUNDLE_RELAY_URL: Record<number, string> = {
    1: '	https://relay.flashbots.net',
    11155111: 'https://relay-sepolia.flashbots.net',
  }

  return {
    getBalance: async (address: string): Promise<bigint> => {
      return await networkProvider.getBalance(address)
    },

    getSupportedNetworks: (): number[] => {
      return [1, 31337, 1337, 11155111]
    },

    isNativeTracerAndNetworkProviderChainMatch: async (): Promise<boolean> => {
      if (nativeTracerProvider === undefined) {
        throw new Error('nativeTracerProvider is not defined')
      }
      const [networkProviderChainId, nativeTracerProviderChainId] =
        await Promise.all([
          networkProvider.getNetwork(),
          nativeTracerProvider.getNetwork(),
        ])

      return (
        nativeTracerProviderChainId.chainId === networkProviderChainId.chainId
      )
    },

    getNetwork: async (): Promise<Network> => {
      return await networkProvider.getNetwork()
    },

    checkContractDeployment: async (
      contractAddress: string,
    ): Promise<boolean> => {
      // Get the bytecode of the deployed contract and compare it to the empty bytecode
      const bytecode = await networkProvider.getCode(contractAddress)
      if (bytecode !== '0x') {
        return true
      } else {
        return false
      }
    },

    clientVerion: async (): Promise<string> => {
      const ret = await networkProvider.send('web3_clientVersion', [])
      return ret.result
    },

    getChainId: async (): Promise<number> => {
      const { chainId } = await networkProvider.getNetwork()
      return Number(chainId)
    },

    getBlockNumber: async (): Promise<number> => {
      return await networkProvider.getBlockNumber()
    },

    getFeeData: async (): Promise<FeeData> => {
      return await networkProvider.getFeeData()
    },

    estimateGas: async (
      from: string,
      to: string,
      data: BytesLike,
    ): Promise<number> => {
      const gasLimit = await networkProvider
        .estimateGas({
          from,
          to,
          data: typeof data === 'object' ? hexlify(data) : data,
        })
        .catch((err) => {
          const message =
            err.message.match(/reason="(.*?)"/)?.at(1) ?? 'execution reverted'
          throw new RpcError(message, ValidationErrors.UserOperationReverted)
        })

      return Number(gasLimit)
    },

    send: async (method: string, params: any[]): Promise<any> => {
      return await networkProvider.send(method, params)
    },

    call: async (contractAddress: string, data: string): Promise<any> => {
      return await networkProvider.call({
        to: contractAddress,
        data: data,
      })
    },

    debug_traceCall: async (
      tx: TransactionRequest,
      options: TraceOptions,
      useNativeTracerProvider = false,
    ): Promise<TraceResult | any> => {
      const provider = useNativeTracerProvider
        ? nativeTracerProvider
        : networkProvider
      if (!provider) {
        throw new Error('provider not found')
      }

      const tx1 = await resolveProperties(tx)
      const ret = await provider
        .send('debug_traceCall', [tx1, 'latest', options])
        .catch((e) => {
          Logger.error(
            {
              error: e,
            },
            'error in debug_traceCall to provider',
          )

          const body = e.body
          if (body != null) {
            const jsonbody = JSON.parse(body)
            throw new RpcError(
              `debug_traceCall - ${jsonbody.error.message}`,
              ValidationErrors.InternalError,
            )
          }
          throw e
        })
      return ret
    },

    debug_traceTransaction: async (
      hash: string,
      options: TraceOptions,
    ): Promise<TraceResult | any> => {
      const ret = await networkProvider.send('debug_traceTransaction', [
        hash,
        options,
      ])
      return ret
    },

    runContractScript: async <T extends ContractFactory>(
      c: T,
      ctrParams: Parameters<T['getDeployTransaction']>,
    ): Promise<Result> => {
      return await doRunContractScript(c, ctrParams)
    },

    getTransactionReceipt: async (
      txHash: string,
    ): Promise<TransactionReceipt> => {
      return await networkProvider.getTransactionReceipt(txHash)
    },

    sendBundleFlashbots: async (
      signer: ethers.Wallet,
      transaction: TransactionRequest,
    ): Promise<FlashbotsTransaction> => {
      const { chainId } = await networkProvider.getNetwork()
      const relayUrl = FLASHBOTS_BUNDLE_RELAY_URL[Number(chainId)]
      if (relayUrl === undefined) {
        throw new Error(
          'Unsupported chainId to send bundle to Flashbots network',
        )
      }

      const flashbotsProvider = new FlashbotsBundleProvider(
        networkProvider,
        signer,
        relayUrl,
        await networkProvider.getNetwork(),
      )

      const signedBundle = await flashbotsProvider.signBundle([
        {
          signer,
          transaction,
        },
      ])

      const blockNumber = await networkProvider.getBlockNumber()

      // TODO: Complete the implementation of sendRawBundle
      return await flashbotsProvider.sendRawBundle(signedBundle, blockNumber)
    },
  }
}
