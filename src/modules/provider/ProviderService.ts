import { Config } from '../config'
import { TransactionRequest } from '@ethersproject/providers'
import { Deferrable } from '@ethersproject/properties'
import { resolveProperties } from 'ethers/lib/utils'
import { TraceOptions, TraceResult, tracer2string } from '../validation'
// from:https://geth.ethereum.org/docs/rpc/ns-debug#javascript-based-tracing

export class ProviderService {
    async getNetwork() {
        const provider = Config.provider
        return await provider.getNetwork()
    }

    async checkContractDeployment(contractAddress: string): Promise<boolean> {
        // Get the bytecode of the deployed contract
        const provider = Config.provider
        const bytecode = await provider.getCode(contractAddress)
    
        // Compare the bytecode to determine if the contract is deployed
        if (bytecode !== '0x') {
            return true
        } else {
            return false
        }
    }

    async supportsRpcMethod(method: string): Promise<boolean> {
        const ret = await Config.provider.send(method, []).catch(e => e)
        let code
        if (ret.url && ret.body && ret.url.includes('alchemy.com')) {
            const alchemyRet = JSON.parse(ret.body)
            code = alchemyRet.error?.code ?? alchemyRet.code
        } else {
            code = ret.error?.code ?? ret.code
        }
        return code === -32602 // wrong params (meaning, method exists)
    }

    async clientVerion(): Promise<string> {
        const ret = await Config.provider.send('web3_clientVersion', [])
        return ret.result
    }

    async getChainId(): Promise<string> {
        const { chainId } = await Config.provider.getNetwork()
        return chainId.toString()
    }

    async getBlockNumber(): Promise<number> {
        return await Config.provider.getBlockNumber()
    }

    async send(method: string, params: any[]): Promise<any> {
        return await Config.provider.send(method, params)
    }

    async debug_traceCall (tx: Deferrable<TransactionRequest>, options: TraceOptions): Promise<TraceResult | any> {
        const tx1 = await resolveProperties(tx)
        const traceOptions = tracer2string(options)
        const ret = await Config.provider.send('debug_traceCall', [tx1, 'latest', traceOptions]).catch(e => {
          console.log('ex=', e.message)
          console.log('tracer=', traceOptions.tracer?.toString().split('\n').map((line, index) => `${index + 1}: ${line}`).join('\n'))
          throw e
        })
        // return applyTracer(ret, options)
        return ret
    }
}