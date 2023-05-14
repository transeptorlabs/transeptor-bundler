import { ethers } from 'ethers'

export async function checkContractDeployment(contractAddress: string, provider: ethers.providers.JsonRpcProvider): Promise<boolean> {
  try {
    // Get the bytecode of the deployed contract
    const bytecode = await provider.getCode(contractAddress)

    // Compare the bytecode to determine if the contract is deployed
    if (bytecode !== '0x') {
        return true
    } else {
        return false
    }
  } catch (error) {
    throw error
  }
}