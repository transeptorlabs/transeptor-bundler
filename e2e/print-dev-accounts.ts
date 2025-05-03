/* eslint-disable no-console */
import { Wallet, ethers, JsonRpcProvider, HDNodeWallet, Mnemonic } from 'ethers'

/**
 * Prints the dev accounts for the E2E tests.
 */
async function main() {
  const mnemonic = 'test test test test test test test test test test test junk'
  const network: ethers.Network = new ethers.Network('localhost', BigInt(1337))
  const provider = new JsonRpcProvider('http://localhost:8545', network, {
    staticNetwork: network,
  })

  const accounts = Array.from({ length: 10 }, (_, i) => {
    const hdNodeWallet = HDNodeWallet.fromMnemonic(
      Mnemonic.fromPhrase(mnemonic),
      `m/44'/60'/0'/0/${i}`,
    )
    const wallet = new Wallet(hdNodeWallet.privateKey).connect(provider)
    return wallet
  })

  accounts.forEach((account, index) => {
    console.log(`Account ${index}: ${account.address}`)
    console.log(`Private Key: ${account.privateKey}\n`)
  })
}

main()
  .then(() => process.exit(0))
  .catch((err: any) => {
    console.error(err, 'Script failed')
    process.exit(1)
  })
