
const { network, ethers } = require("hardhat");
const { parseEther } = require("ethers/lib/utils");
const { Wallet } = require("ethers");
const dotenv = require("dotenv");
dotenv.config()

async function main() {
  if (network.config.chainId !== 1337 && network.config.chainId !== 31337) {
    console.log('NOT deploying contracts. use pre-deployed contracts')
    process.exit(1)
  }

  // on geth, fund the default "hardhat node" account.
  console.log('<<<<<--Running script to fund default signer account-->>>>>')

  const net = await ethers.provider.getNetwork()
  if (net.chainId !== 1337 && net.chainId !== 31337) {
    console.log('NOT funding default signer account. use pre-funded signer account')
    process.exit(1)
  }

  const provider = ethers.provider
  const signer = provider.getSigner()
  const signerBalance = await provider.getBalance(signer.getAddress())

  // get default signer account address
  const mnemonic = process.env.MNEMONIC || 'test '.repeat(11) + 'junk'
  const wallet = Wallet.fromMnemonic(mnemonic)
  const account = await wallet.getAddress()
  const bal = await provider.getBalance(account)

  // fund the default "hardhat node" account
  if ((bal.gte(parseEther('0')) && bal.lte(parseEther('1000')))&& signerBalance.gte(parseEther('10000'))) {
    console.log('Funding Bundler signer with 10 ETH:', account)
    await signer.sendTransaction({
      to: account,
      value: parseEther('10'),
    })
  }
}



main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
