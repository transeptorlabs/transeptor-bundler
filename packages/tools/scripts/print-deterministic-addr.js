const { EntryPoint__factory, SimpleAccountFactory__factory } = require("@account-abstraction/contracts");
const { DeterministicDeployer } = require("@account-abstraction/sdk");
const { ethers } = require("hardhat");

async function main() {
  console.log('<<<<<--Running script to print entry point and simple account factory address-->>>>>')
  const dep = new DeterministicDeployer(ethers.provider)
  const epAddr = DeterministicDeployer.getAddress(EntryPoint__factory.bytecode)
  const accountDeployerAdd = DeterministicDeployer.getAddress(new SimpleAccountFactory__factory(), 0, [epAddr])

  console.log(`Entry point address: ${epAddr} - ${await dep.isContractDeployed(epAddr)}`)
  console.log(`Simple account factory address: ${accountDeployerAdd} - ${await dep.isContractDeployed(accountDeployerAdd)}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
})
