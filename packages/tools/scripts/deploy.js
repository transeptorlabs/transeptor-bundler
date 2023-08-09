
const { network, ethers } = require("hardhat");

const { DeterministicDeployer } = require("@account-abstraction/sdk");
const { EntryPoint__factory } = require("@account-abstraction/contracts");

async function main() {
  if (network.config.chainId !== 1337 && network.config.chainId !== 31337) {
    console.log('NOT deploying contracts. use pre-deployed contracts')
    process.exit(1)
  }

  console.log('<<<<<--Running script to deploy EntryPoint contract-->>>>>')
  const dep = new DeterministicDeployer(ethers.provider)
  const epAddr = DeterministicDeployer.getAddress(EntryPoint__factory.bytecode)
  if (await dep.isContractDeployed(epAddr)) {
    console.log(`EntryPoint already deployed at ${epAddr}`)
    return
  }

  const net = await ethers.provider.getNetwork()
  if (net.chainId !== 1337 && net.chainId !== 31337) {
    console.log('NOT deploying EntryPoint. use pre-deployed entrypoint')
    process.exit(1)
  }

  await dep.deterministicDeploy(EntryPoint__factory.bytecode)
  console.log(`Deployed EntryPoint at ${epAddr} on chainId ${net.chainId}`)
}



main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
