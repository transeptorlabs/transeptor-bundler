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
  toBeHex,
} from 'ethers'

import { Logger } from '../logger/index.js'
import {
  TraceOptions,
  TraceResult,
  ValidationErrors,
  NetworkCallError,
  RpcError,
  EIP7702Authorization,
  BundlerSignerWallets,
} from '../types/index.js'
import { Either } from '../monad/index.js'
import { IENTRY_POINT_ABI, IStakeManager } from '../abis/index.js'
import { isValidAddress } from '../utils/index.js'

export type ProviderService = {
  getNetwork(): Promise<Network>
  checkContractDeployment(contractAddress: string): Promise<boolean>
  clientVersion(): Promise<string>
  getChainId(): Promise<number>
  getBlockNumber(): Promise<number>
  getFeeData(): Promise<FeeData>
  estimateGas(
    from: string,
    to: string,
    data: BytesLike,
    authorizationList: EIP7702Authorization[] | null,
  ): Promise<Either<RpcError, number>>
  send<R>(method: string, params: any[]): Promise<Either<NetworkCallError, R>>
  call(contractAddress: string, data: string): Promise<any>
  debug_traceCall<R>(
    tx: TransactionRequest,
    traceOptions: TraceOptions,
    useNativeTracerProvider?: boolean,
  ): Promise<Either<RpcError, R>>
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
  sendTransactionToFlashbots(
    signedTransaction: string,
    refundAddress: string,
  ): Promise<string>
  getBalance(address: string): Promise<bigint>
  getTransactionCount(
    address: ethers.AddressLike,
    blockTag?: ethers.BlockTag,
  ): Promise<number>
  getCode(address: ethers.AddressLike): Promise<string>
  getEntryPointContractDetails(): ContractDetails
  getStakeManagerContractDetails(): ContractDetails
  getBundlerSignerWallets(): BundlerSignerWallets
}

export type ProviderServiceConfig = {
  networkProvider: JsonRpcProvider
  supportedEntryPointAddress: string
  signers: BundlerSignerWallets
}

export type ContractDetails = {
  contract: ethers.Contract
  address: string
}

export type ContractMapping = {
  entryPoint: ContractDetails
  stakeManager: ContractDetails
}

export const createProviderService = async (
  config: Readonly<ProviderServiceConfig>,
): Promise<ProviderService> => {
  const { networkProvider, supportedEntryPointAddress, signers } = config
  const FLASHBOTS_BUNDLE_RELAY_URL: Record<number, string> = {
    1: '	https://relay.flashbots.net',
    11155111: 'https://relay-sepolia.flashbots.net',
  }

  // Helper function to set up contracts
  const setupContracts = async (): Promise<ContractMapping> => {
    if (!isValidAddress(supportedEntryPointAddress)) {
      throw new Error('Entry point not a valid address')
    }

    return {
      entryPoint: {
        contract: new ethers.Contract(
          supportedEntryPointAddress,
          IENTRY_POINT_ABI,
          networkProvider,
        ),
        address: supportedEntryPointAddress,
      },
      stakeManager: {
        contract: new ethers.Contract(
          supportedEntryPointAddress,
          IStakeManager,
          networkProvider,
        ),
        address: supportedEntryPointAddress,
      },
    }
  }

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

  const contractMapping: ContractMapping = await setupContracts()

  return {
    getEntryPointContractDetails: () => contractMapping.entryPoint,

    getStakeManagerContractDetails: () => contractMapping.stakeManager,

    getBundlerSignerWallets: () => signers,

    getBalance: async (address: string): Promise<bigint> => {
      return await networkProvider.getBalance(address)
    },

    getSupportedNetworks: (): number[] => {
      return [1, 31337, 1337, 11155111]
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

    clientVersion: async (): Promise<string> =>
      networkProvider.send('web3_clientVersion', []),

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
      authorizationList: EIP7702Authorization[] | null,
    ): Promise<Either<RpcError, number>> => {
      try {
        const gasLimit = await networkProvider.send('eth_estimateGas', [
          {
            from,
            to,
            data: typeof data === 'object' ? hexlify(data) : data,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            authorizationList:
              authorizationList.length === 0 ? null : authorizationList,
          },
        ])
        return Either.Right(Number(gasLimit))
      } catch (err: any) {
        const message =
          err.message.match(/reason="(.*?)"/)?.at(1) ?? 'execution reverted'
        return Either.Left(
          new RpcError(message, ValidationErrors.UserOperationReverted),
        )
      }
    },

    send: async <R>(
      method: string,
      params: any[],
    ): Promise<Either<NetworkCallError, R>> => {
      try {
        const res = await networkProvider.send(method, params)
        return Either.Right(res)
      } catch (err: any) {
        return Either.Left(
          new NetworkCallError(`call to method ${method} failed:`, err),
        )
      }
    },

    call: async (contractAddress: string, data: string): Promise<any> => {
      return await networkProvider.call({
        to: contractAddress,
        data: data,
      })
    },

    debug_traceCall: async <R>(
      tx: TransactionRequest,
      traceOptions: TraceOptions,
    ): Promise<Either<RpcError, R>> => {
      if (!networkProvider) {
        return Either.Left(
          new RpcError('provider not found', ValidationErrors.InternalError),
        )
      }

      try {
        const tx1 = await resolveProperties(tx)
        const ret = await networkProvider.send('debug_traceCall', [
          tx1,
          'latest',
          traceOptions,
        ])

        return Either.Right(ret)
      } catch (err: any) {
        Logger.error(
          {
            error: err,
          },
          'error in debug_traceCall to provider',
        )

        const body = err.body
        if (body != null) {
          const jsonbody = JSON.parse(body)
          return Either.Left(
            new RpcError(
              `debug_traceCall - ${jsonbody.error.message}`,
              ValidationErrors.InternalError,
            ),
          )
        }
        return Either.Left(
          new RpcError(
            `debug_traceCall - unknown error: ${err.message}`,
            ValidationErrors.InternalError,
          ),
        )
      }
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

    sendTransactionToFlashbots: async (
      signedTransaction: string,
      refundAddress: string,
    ): Promise<string> => {
      const { chainId } = await networkProvider.getNetwork()
      const relayUrl = FLASHBOTS_BUNDLE_RELAY_URL[Number(chainId)]
      if (relayUrl === undefined) {
        throw new Error(
          'Unsupported chainId to send bundle to Flashbots network',
        )
      }

      const network: ethers.Network = new ethers.Network(
        'flashbot-relay',
        BigInt(chainId),
      )
      const flashbotsProvider = new JsonRpcProvider(relayUrl, network, {
        staticNetwork: network,
      })

      const blockNum = await networkProvider.getBlockNumber()
      const maxBlockNumber = blockNum + 5

      // Send to Flashbots relay rpc: https://docs.flashbots.net/flashbots-auction/advanced/rpc-endpoint#eth_sendprivatetransaction
      return await flashbotsProvider
        .send('eth_sendPrivateTransaction', [
          {
            tx: signedTransaction,
            maxBlockNumber: toBeHex(maxBlockNumber),
            preferences: {
              fast: true,
              privacy: {
                hints: ['contract_address', 'transaction_hash'],
                builders: ['default'],
              },
              validity: {
                refund: [{ address: refundAddress, percent: 50 }],
              },
            },
          },
        ])
        .catch((e) => {
          const body = e.body
          if (body != null) {
            const jsonbody = JSON.parse(body)
            throw new Error(
              `error sending eth_sendPrivateTransaction to Flashbots relay- ${jsonbody.error.message}`,
            )
          }
          throw e
        })
    },

    getTransactionCount: async (
      address: ethers.AddressLike,
      blockTag?: ethers.BlockTag,
    ): Promise<number> => {
      return await networkProvider.getTransactionCount(address, blockTag)
    },

    getCode: async (address: ethers.AddressLike): Promise<string> => {
      return await networkProvider.getCode(address)
    },
  }
}
