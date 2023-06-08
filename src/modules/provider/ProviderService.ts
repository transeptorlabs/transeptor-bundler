import { ContractFactory, Wallet, ethers, providers } from 'ethers'
import { TransactionRequest } from '@ethersproject/providers'
import { Deferrable } from '@ethersproject/properties'
import { Result, resolveProperties } from 'ethers/lib/utils'
import { TraceOptions, TraceResult, tracer2string } from '../validation'
import { Logger } from '../logger'
import { ExecutionErrors, RpcError } from '../utils'

export class ProviderService {
    private readonly provider: providers.JsonRpcProvider
    private readonly connectedWallet: Wallet 

    constructor(provider: providers.JsonRpcProvider, connectedWallet: Wallet) {
        this.provider = provider
        this.connectedWallet = connectedWallet
    }

    async getNetwork(): Promise<ethers.providers.Network> {
        return await this.provider.getNetwork()
    }

    public async checkContractDeployment(contractAddress: string): Promise<boolean> {
        // Get the bytecode of the deployed contract
        const provider = this.provider
        const bytecode = await provider.getCode(contractAddress)
    
        // Compare the bytecode to determine if the contract is deployed
        if (bytecode !== '0x') {
            return true
        } else {
            return false
        }
    }

    public async supportsRpcMethod(method: string): Promise<boolean> {
        const ret = await this.provider.send(method, []).catch(e => e)
        let code
        if (ret.url && ret.body && ret.url.includes('alchemy.com')) {
            const alchemyRet = JSON.parse(ret.body)
            // code = alchemyRet.error?.code ?? alchemyRet.code
            code === -32602 // wrong params (meaning, method exists) alchemy can not support full validation
        } else {
            code = ret.error?.code ?? ret.code
        }
        return code === -32602 // wrong params (meaning, method exists)
    }

    public async clientVerion(): Promise<string> {
        const ret = await this.provider.send('web3_clientVersion', [])
        return ret.result
    }

    public async getChainId(): Promise<number> {
        const { chainId } = await this.provider.getNetwork()
        return chainId
    }

    public async getBlockNumber(): Promise<number> {
        return await this.provider.getBlockNumber()
    }

    public async getSignerBalance(): Promise<ethers.BigNumber> {
        return await this.connectedWallet.getBalance()
    }

    public async getSignerAddress(): Promise<string> {
        return await this.connectedWallet.getAddress()
    }

    public async getFeeData(): Promise<ethers.providers.FeeData> {
        return await this.provider.getFeeData()
    }

    public async getTransactionCount(): Promise<number> {
        return await this.connectedWallet.getTransactionCount()
    }

    public async signTransaction(tx: Deferrable<TransactionRequest>): Promise<string> {
        const tx1 = await resolveProperties(tx)
        return this.connectedWallet.signTransaction(tx1)
    }

    public async estimateGas(from: string, to: string, data: string | ethers.utils.Bytes): Promise<number> {
        const gasLimit = await this.provider.estimateGas({
            from,
            to,
            data
        }).catch(err => {
            const message = err.message.match(/reason="(.*?)"/)?.at(1) ?? 'execution reverted'
            throw new RpcError(message, ExecutionErrors.UserOperationReverted)
        })

        return gasLimit.toNumber()
    }

    public async send(method: string, params: any[]): Promise<any> {
        return await (this.connectedWallet.provider as providers.JsonRpcProvider).send(method, params)
    }

    public async call(contractAddress: string, data: string): Promise<any> {
        return await (this.connectedWallet.provider as providers.JsonRpcProvider).call({
            to: contractAddress,
            data: data
        })
    }

    public async debug_traceCall (tx: Deferrable<TransactionRequest>, options: TraceOptions): Promise<TraceResult | any> {
        const tx1 = await resolveProperties(tx)
        const traceOptions = tracer2string(options)
        const ret = await this.provider.send('debug_traceCall', [tx1, 'latest', traceOptions]).catch(e => {
            Logger.error({error: e.message}, 'ex=')
            Logger.debug({traceOptions: traceOptions.tracer?.toString().split('\n').map((line, index) => `${index + 1}: ${line}`).join('\n')}, 'tracer=')
            throw e
        })
        // return applyTracer(ret, options)
        return ret
    }

    // a hack for network that doesn't have traceCall: mine the transaction, and use debug_traceTransaction
    public async execAndTrace (tx: Deferrable<TransactionRequest>, options: TraceOptions): Promise<TraceResult | any> {
        const hash = await this.provider.getSigner().sendUncheckedTransaction(tx)
        return await this.debug_traceTransaction(hash, options)
    }

    public async debug_traceTransaction (hash: string, options: TraceOptions): Promise<TraceResult | any> {
        const ret = await this.provider.send('debug_traceTransaction', [hash, tracer2string(options)])
        return ret
    }

    /** Note that the contract deployment will cost gas, so it is not free to run this function
     * run the constructor of the given type as a script: it is expected to revert with the script's return values.
     * @param provider provider to use for the call
     * @param c - contract factory of the script class
     * @param ctrParams constructor parameters
     * @return an array of arguments of the error
     * example usasge:
     *     hashes = await runContractScript(provider, new GetUserOpHashes__factory(), [entryPoint.address, userOps]).then(ret => ret.userOpHashes)
     */
    public async runContractScript<T extends ContractFactory> (c: T, ctrParams: Parameters<T['getDeployTransaction']>): Promise<Result> {
        const tx = c.getDeployTransaction(...ctrParams)
        const ret = await this.provider.call(tx)
        const parsed = ContractFactory.getInterface(c.interface).parseError(ret)
        if (parsed == null) throw new Error('unable to parse script (error) response: ' + ret)
        return parsed.args
    }
}