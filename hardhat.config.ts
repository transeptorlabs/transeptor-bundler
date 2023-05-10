import '@nomiclabs/hardhat-ethers'
import '@nomicfoundation/hardhat-toolbox'
import 'hardhat-deploy'

import { HardhatUserConfig } from 'hardhat/config'
import { NetworkUserConfig } from 'hardhat/src/types/config'
import dotenv from 'dotenv'
dotenv.config()

const mnemonic = process.env.MNEMONIC || 'test '.repeat(11) + 'junk'

const infuraUrl = (name: string): string => `https://${name}.infura.io/v3/${process.env.INFURA_API_KEY}`
const alchemyUrl = (name: string): string => `https://${name}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`

function getNetwork (url: string): NetworkUserConfig {
  return {
    url,
    accounts: {
      mnemonic
    }
  }
}

function getInfuraNetwork (name: string): NetworkUserConfig {
  return getNetwork(infuraUrl(name))
}

function getAlchemyNetwork (name: string): NetworkUserConfig {
  return getNetwork(alchemyUrl(name))
}

const config: HardhatUserConfig = {
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5'
  },
  networks: {
    localhost: {
      url: 'http://localhost:8545/',
    },
    goerli: getInfuraNetwork('goerli')
  },
  solidity: {
    version: '0.8.15',
    settings: {
      optimizer: { enabled: true }
    }
  }
}

export default config
