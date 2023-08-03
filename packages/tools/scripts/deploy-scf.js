
const { network, ethers } = require("hardhat");

const { DeterministicDeployer } = require("@account-abstraction/sdk");
const { EntryPoint__factory, SimpleAccountFactory__factory } = require("@account-abstraction/contracts");

async function main() {
  if (network.config.chainId !== 1337 && network.config.chainId !== 31337) {
    console.log('NOT deploying contracts. use pre-deployed contracts')
    process.exit(1)
  }

  console.log('<<<<<--Running script to deploy Simple account factory contract-->>>>>')
  const dep = new DeterministicDeployer(ethers.provider)
  const epAddr = DeterministicDeployer.getAddress(EntryPoint__factory.bytecode)
  const accountDeployerAdd = await DeterministicDeployer.getAddress(new SimpleAccountFactory__factory(), 0, [epAddr])

  if (await dep.isContractDeployed(accountDeployerAdd)) {
    console.log(`Simple account factory already deployed at ${accountDeployerAdd}`)
    return
  }

  const net = await ethers.provider.getNetwork()
  if (net.chainId !== 1337 && net.chainId !== 31337) {
    console.log('NOT deploying Simple account factory. use pre-deployed Simple account factory')
    process.exit(1)
  }

  await dep.deterministicDeploy(new SimpleAccountFactory__factory(), 0, [epAddr])
  console.log(`Deployed Simple account factory at ${accountDeployerAdd} on chainId ${net.chainId}`)
}



main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
