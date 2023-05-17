import Config from './Config'

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
        // TODO: fix alchemy 400 error
        const ret = await Config.provider.send(method, []).catch(e => e)
        const code = ret.error?.code ?? ret.code
        return code === -32602 // wrong params (meaning, method exists)
    }

    async clientVerion(): Promise<string> {
        const ret = await Config.provider.send('web3_clientVersion', [])
        return ret.result
    }
}