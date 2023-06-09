import '@nomiclabs/hardhat-ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import { DeterministicDeployer } from '@account-abstraction/sdk'
import { EntryPoint__factory } from '@account-abstraction/contracts'

/*
  * This script deploys the EntryPoint contract to the local network.
  geth: chainId 1337
*/
const deployEP: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('<<<<<--Running script to deploy EntryPoint contract-->>>>>')
  const dep = new DeterministicDeployer(ethers.provider)
  const epAddr = DeterministicDeployer.getAddress(EntryPoint__factory.bytecode)
  if (await dep.isContractDeployed(epAddr)) {
    console.log(`EntryPoint already deployed at ${epAddr}`)
    return
  }

  const net = await hre.ethers.provider.getNetwork()
  if (net.chainId !== 1337 && net.chainId !== 31337) {
    console.log('NOT deploying EntryPoint. use pre-deployed entrypoint')
    process.exit(1)
  }

  await dep.deterministicDeploy(EntryPoint__factory.bytecode)
  console.log(`Deployed EntryPoint at ${epAddr} on chainId ${net.chainId}`)
}

export default deployEP
