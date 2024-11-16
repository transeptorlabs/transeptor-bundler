import { Deferrable } from '@ethersproject/properties'
import { TransactionRequest } from '@ethersproject/providers'
import { ContractFactory, ethers, providers } from 'ethers'
import { Result, resolveProperties } from 'ethers/lib/utils.js'

import { Logger } from '../logger/index.js'
import { TraceOptions, TraceResult } from '../sim/index.js'
import { ValidationErrors } from '../validatation/index.js'
import { RpcError } from '../utils/index.js'

export type ProviderService = {
  getNetwork(): Promise<ethers.providers.Network>
  checkContractDeployment(contractAddress: string): Promise<boolean>
  clientVerion(): Promise<string>
  getChainId(): Promise<number>
  getBlockNumber(): Promise<number>
  getFeeData(): Promise<ethers.providers.FeeData>
  estimateGas(
    from: string,
    to: string,
    data: string | ethers.utils.Bytes,
  ): Promise<number>
  send(method: string, params: any[]): Promise<any>
  call(contractAddress: string, data: string): Promise<any>
  debug_traceCall(
    tx: Deferrable<TransactionRequest>,
    options: TraceOptions,
    useNativeTracerProvider?: boolean,
  ): Promise<TraceResult | any>
  execAndTrace(
    tx: Deferrable<TransactionRequest>,
    options: TraceOptions,
  ): Promise<TraceResult | any>
  debug_traceTransaction(
    hash: string,
    options: TraceOptions,
  ): Promise<TraceResult | any>
  getCodeHashes<T extends ContractFactory>(
    c: T,
    ctrParams: Parameters<T['getDeployTransaction']>,
  ): Promise<Result>
  getTransactionReceipt(txHash: string): Promise<providers.TransactionReceipt>
  getSupportedNetworks(): number[]
}

export const createProviderService = (
  networkProvider: providers.JsonRpcProvider,
  nativeTracerProvider: providers.JsonRpcProvider | undefined,
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
   * const hashes = await runContractScript(provider, new GetUserOpHashes__factory(), [entryPoint.address, userOps]).then(ret => ret.userOpHashes)
   */
  const runContractScript = async <T extends ContractFactory>(
    c: T,
    ctrParams: Parameters<T['getDeployTransaction']>,
  ): Promise<Result> => {
    const tx = c.getDeployTransaction(...ctrParams)
    const ret = await networkProvider.call(tx)
    const parsed = ContractFactory.getInterface(c.interface).parseError(ret)
    if (parsed == null)
      throw new Error('unable to parse script (error) response: ' + ret)
    return parsed.args
  }

  return {
    getSupportedNetworks: (): number[] => {
      return [1, 31337, 1337]
    },

    getNetwork: async (): Promise<ethers.providers.Network> => {
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
      return chainId
    },

    getBlockNumber: async (): Promise<number> => {
      return await networkProvider.getBlockNumber()
    },

    getFeeData: async (): Promise<ethers.providers.FeeData> => {
      return await networkProvider.getFeeData()
    },

    estimateGas: async (
      from: string,
      to: string,
      data: string | ethers.utils.Bytes,
    ): Promise<number> => {
      const gasLimit = await networkProvider
        .estimateGas({
          from,
          to,
          data,
        })
        .catch((err) => {
          const message =
            err.message.match(/reason="(.*?)"/)?.at(1) ?? 'execution reverted'
          throw new RpcError(message, ValidationErrors.UserOperationReverted)
        })

      return gasLimit.toNumber()
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
      tx: Deferrable<TransactionRequest>,
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
          Logger.error({ error: e.message }, 'error in debug_traceCall')
          throw e
        })
      return ret
    },

    // a hack for network that doesn't have traceCall: mine the transaction, and use debug_traceTransaction
    execAndTrace: async (
      tx: Deferrable<TransactionRequest>,
      options: TraceOptions,
    ): Promise<TraceResult | any> => {
      const hash = await networkProvider
        .getSigner()
        .sendUncheckedTransaction(tx)
      return await networkProvider.send('debug_traceTransaction', [
        hash,
        options,
      ])
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

    getCodeHashes: async <T extends ContractFactory>(
      c: T,
      ctrParams: Parameters<T['getDeployTransaction']>,
    ): Promise<Result> => {
      return await runContractScript(c, ctrParams)
    },

    getTransactionReceipt: async (
      txHash: string,
    ): Promise<providers.TransactionReceipt> => {
      return await networkProvider.getTransactionReceipt(txHash)
    },
  }
}
