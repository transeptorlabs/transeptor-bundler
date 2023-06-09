import '@nomiclabs/hardhat-ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { parseEther } from 'ethers/lib/utils'
import { Wallet } from 'ethers'
import dotenv from 'dotenv'
dotenv.config()

/*
  * This script funds bundler signer account locally.
  geth: chainId 1337
  signer account: default "hardhat node" account as the signer
*/
const fundsigner: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  // on geth, fund the default "hardhat node" account.
  console.log('<<<<<--Running script to fund default signer account-->>>>>')

  const net = await hre.ethers.provider.getNetwork()
  if (net.chainId !== 1337 && net.chainId !== 31337) {
    console.log('NOT funding default signer account. use pre-funded signer account')
    process.exit(1)
  }

  const provider = hre.ethers.provider
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

export default fundsigner
