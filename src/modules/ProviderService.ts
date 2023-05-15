import { Config } from './Config'

export class ProviderService {
    async getNetwork() {
        const provider = Config.getInstance().getProvider()
        return await provider.getNetwork()
    }

    async checkContractDeployment(contractAddress: string): Promise<boolean> {
        // Get the bytecode of the deployed contract
        const provider = Config.getInstance().getProvider()
        const bytecode = await provider.getCode(contractAddress)
    
        // Compare the bytecode to determine if the contract is deployed
        if (bytecode !== '0x') {
            return true
        } else {
            return false
        }
    }
}