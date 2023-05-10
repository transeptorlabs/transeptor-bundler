import hre from "hardhat"
import { Wallet } from 'ethers'
import dotenv from 'dotenv'
dotenv.config()

/*
    on geth local node we use the default "hardhat node" account as the signer
    This script reads the mnemonic from the file specified in the environment variable MNEMONIC
*/
async function main() {
  console.log("<<<<<--Running script to check ETH balance of default signer account-->>>>>")
  const mnemonic = process.env.MNEMONIC || 'test '.repeat(11) + 'junk'
  const provider = hre.ethers.provider
  const wallet = Wallet.fromMnemonic(mnemonic).connect(provider)

  const bundlerSignerAccount = await wallet.getAddress()
  const bal = await provider.getBalance(bundlerSignerAccount)

  console.log("Bundler signer account address:", bundlerSignerAccount)
  console.log(`ETH balance:, ${bal.toString()} wei (${hre.ethers.utils.formatEther(bal)} ETH)`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
})
