import dotenv from 'dotenv'
import { Wallet, providers, ethers, BigNumber, utils } from 'ethers'
import { IENTRY_POINT_ABI } from '../src/abis'
import { UserOperation } from '../src/types'
import { packUserOp, deepHexlify } from '../src/utils'
import { globalCounterABI, simpleAccountABI, simpleAccountFactoryABI } from './abi.e2e'
import { Logger } from '../src/logger'
dotenv.config()

const provider = new providers.StaticJsonRpcProvider('http://localhost:8545')
const bundlerProvider = new ethers.providers.StaticJsonRpcProvider('http://localhost:4337/rpc')

// Derive the second account from the HDNode and create a new wallet for the second account
const hdNode = ethers.utils.HDNode.fromMnemonic(process.env.MNEMONIC as string)
const secondAccount = hdNode.derivePath('m/44\'/60\'/0\'/0/1')
const secondAccountPrivateKey = secondAccount.privateKey
const secondWallet = new Wallet(secondAccountPrivateKey, provider).connect(provider)

// contract instances
const epAddress = process.env.ENTRYPOINT_ADDRESS as string
const simpleAccountFatoryAddreess = process.env.TRANSEPTOR_E2E_SIMPLE_ACCOUNT_FACTORY as string
const globalCounterAddress = process.env.TRANSEPTOR_E2E_GLOBAL_COUNTER as string

const epContract = new ethers.Contract(epAddress, IENTRY_POINT_ABI, secondWallet)
const globalCounter = new ethers.Contract(
  globalCounterAddress,
  globalCounterABI
)
const simpleAccountFactory = new ethers.Contract(
    simpleAccountFatoryAddreess,
    simpleAccountFactoryABI
)

// Helper functions
const ethNodeUp = async () => {
  try {
    await provider.send('web3_clientVersion', [])
    return true
  } catch (e) {
    Logger.error('Local Ethereum node is down')
    return false
  }
}

const bundlerNodeUp = async () => {
  try {
    await bundlerProvider.send('web3_clientVersion', [])
    return true
  } catch (e) {
    Logger.error('Local Bundler node is down')
    return false
  }
}

const getCfFactoryData = (owner: string) => {
    const salt = BigNumber.from(Math.floor(Math.random() * 10000000)).toNumber() // a random salt 
    Logger.info(`Salt: ${salt}`)
    return {
        factory: simpleAccountFactory.address,
        factoryData: simpleAccountFactory.interface.encodeFunctionData('createAccount', [owner, salt]),
    }
}

const getSenderCfAddress = async (initCode: string): Promise<string> => {
    try {
        await epContract.callStatic.getSenderAddress(initCode)
    } catch (error: any) {
      if (error.errorArgs === null ||error.data === null || error.errorName === null) {
        Logger.error(error, 'Error must have errorArgs, data and errorName')
        throw error
      }

      const errorData = error.data as string
      const SenderAddressResult = utils.keccak256(utils.toUtf8Bytes('SenderAddressResult(address)')).slice(0, 10)
      if (!errorData.startsWith(SenderAddressResult)) {
        Logger.error(error, 'Invalid error, looking for SenderAddressResult(address)')
        throw error
      } 

      const [senderAddress] = utils.defaultAbiCoder.decode(['address'], '0x' + errorData.substring(10))
      return senderAddress as string
    }
    throw new Error('must handle revert')
}

const getUserOpCallData = (senderAddress: string) => {
    const simpleAccount = new ethers.Contract(
      senderAddress,
      simpleAccountABI,
    )

    return simpleAccount.interface.encodeFunctionData('execute', [
      globalCounterAddress, // to
      BigNumber.from(0), // value
      globalCounter.interface.encodeFunctionData('increment', []), // data
    ])
}

const sendDeposit = async (senderAddress: string, feeData: providers.FeeData) => {
    const depositInWei = BigNumber.from(2)
    const transactionData = await epContract.populateTransaction.depositTo(
      senderAddress,
      {
        type: 2,
        nonce: await provider.getTransactionCount(secondWallet.address, 'latest'),
        gasLimit: ethers.utils.hexlify(100_000),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? BigNumber.from(0),
        maxFeePerGas: feeData.maxFeePerGas ?? BigNumber.from(0),
        value: depositInWei.toString(),
      },
    )
    transactionData.chainId = 1337
  
    const signedTx = await secondWallet.signTransaction(transactionData)
    const res = await provider.sendTransaction(signedTx)
    await res.wait()

    const senderDepoit = await getDeposit(senderAddress)
    if (!senderDepoit.eq(depositInWei)) {
      Logger.error(`Deposit failed: ${senderDepoit.toString()} != ${depositInWei.toString()}`)
      throw new Error('Deposit failed')
    }
    Logger.info(`Sender deposit: ${await getDeposit(senderAddress)} ETH`) 
}

const getDeposit = async (accountAddr: string): Promise<BigNumber> => {
    return epContract.balanceOf(accountAddr)
}

// Run user operation through bundler
async function main() {
    Logger.info('Sending user operation...')
    if (!await ethNodeUp() || !await bundlerNodeUp()) {
      return
    }

    const senderBalance = await provider.getBalance(secondWallet.address)
    Logger.info({balance: `${senderBalance.toString()} wei`, address: secondWallet.address}, 'Owner')

    const {factory, factoryData} = getCfFactoryData(secondWallet.address)
    const senderCfAddress = await getSenderCfAddress(ethers.utils.hexConcat([factory,factoryData]))
    Logger.info(`Sender CF address: ${senderCfAddress}`)

    // Deposit to the sender CF address
    const feeData = await provider.getFeeData()
    await sendDeposit(senderCfAddress, feeData)

    // build and sign userOp 
    const userOp = {
      sender: senderCfAddress,
      nonce: BigNumber.from(0),
      factory: factory,
      factoryData:factoryData,
      callData: getUserOpCallData(senderCfAddress),
      callGasLimit: BigNumber.from(1000000),
      verificationGasLimit: BigNumber.from(1000000),
      preVerificationGas: BigNumber.from(1000000),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toHexString() ?? BigNumber.from(0).toHexString(),
      maxFeePerGas: feeData.maxFeePerGas?.toHexString() ?? BigNumber.from(0).toHexString(),
      signature: '0x',
    } as UserOperation

    const userOpHashTodSign = ethers.utils.arrayify(
        await epContract.getUserOpHash(packUserOp(userOp)),
    )
    const signature = await secondWallet.signMessage(userOpHashTodSign)
    const signedUserOp = deepHexlify({ ...userOp, signature })

    // Send userOp
    const userOpHash = await bundlerProvider.send('eth_sendUserOperation', [signedUserOp, epAddress]).catch((error: any) => {
      const parseJson = JSON.parse(error.body)
      Logger.error(parseJson, 'Failed to send user operation.')
      throw new Error('Failed to send user operation.')
    })
    Logger.info('UserOp hash:', userOpHash)
}

main()
  .then(() => process.exit(0))
  .catch(() => {
    process.exit(1)
})