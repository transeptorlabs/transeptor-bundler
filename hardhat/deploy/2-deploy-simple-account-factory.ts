import '@nomiclabs/hardhat-ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import { DeterministicDeployer } from '@account-abstraction/sdk'
import { EntryPoint__factory, SimpleAccountFactory__factory} from '@account-abstraction/contracts'

/*
  * This script deploys the Simple account factory contract to the local network.
  geth: chainId 1337
*/
const deploySaf: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('<<<<<--Running script to deploy Simple account factory contract-->>>>>')
  const dep = new DeterministicDeployer(ethers.provider)
  const epAddr = DeterministicDeployer.getAddress(EntryPoint__factory.bytecode)
  const accountDeployerAdd = await DeterministicDeployer.getAddress(new SimpleAccountFactory__factory(), 0, [epAddr])

  if (await dep.isContractDeployed(accountDeployerAdd)) {
    console.log(`Simple account factory already deployed at ${accountDeployerAdd}`)
    return
  }

  const net = await hre.ethers.provider.getNetwork()
  if (net.chainId !== 1337 && net.chainId !== 31337) {
    console.log('NOT deploying Simple account factory. use pre-deployed Simple account factory')
    process.exit(1)
  }

  await dep.deterministicDeploy(new SimpleAccountFactory__factory(), 0, [epAddr])
  console.log(`Deployed Simple account factory at ${accountDeployerAdd} on chainId ${net.chainId}`)
}

export default deploySaf
