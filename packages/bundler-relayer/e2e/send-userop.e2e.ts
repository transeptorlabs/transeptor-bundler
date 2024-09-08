import dotenv from 'dotenv'
import { Wallet, providers, ethers, BigNumber, utils } from 'ethers'

import { IENTRY_POINT_ABI } from '../../shared/abis/index.js'
import { Logger } from '../../shared/logger/index.js'
import { UserOperation } from '../../shared/types/index.js'
import { packUserOp, deepHexlify } from '../../shared/utils/index.js'

import {
  globalCounterABI,
  simpleAccountABI,
  simpleAccountFactoryABI,
} from './abi.e2e.js'
dotenv.config()

const provider = new providers.StaticJsonRpcProvider('http://localhost:8545')
const bundlerProvider = new ethers.providers.StaticJsonRpcProvider('http://localhost:4337/rpc')
const dummySig = '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c'

// Derive the second account from the HDNode and create a new wallet for the second account
const hdNode = ethers.utils.HDNode.fromMnemonic(process.env.TRANSEPTOR_E2E_TRANSEPTOR_MNEMONIC as string)
const secondAccount = hdNode.derivePath('m/44\'/60\'/0\'/0/1')
const secondAccountPrivateKey = secondAccount.privateKey
const secondWallet = new Wallet(secondAccountPrivateKey, provider).connect(provider)

// contract instances
const epAddress = process.env.TRANSEPTOR_ENTRYPOINT_ADDRESS as string
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
const simpleAccountInterface = new utils.Interface(simpleAccountABI)

const getCfFactoryData = (owner: string) => {
    const salt = BigNumber.from(Math.floor(Math.random() * 10000000)).toNumber() // a random salt 
    return {
        factory: simpleAccountFactory.address,
        factoryData: simpleAccountFactory.interface.encodeFunctionData('createAccount', [owner, salt]),
        salt,
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
    // Convert 10 ETH to Wei
    const depositInWei = ethers.utils.parseEther('10.0')
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
    Logger.info(`Sender deposit: ${await getDeposit(senderAddress)} wei`) 
}

const getDeposit = async (accountAddr: string): Promise<BigNumber> => {
    return epContract.balanceOf(accountAddr)
}

const decodeSCAccountRevertReason = (error: string): any => {
  const parseError = simpleAccountInterface.parseError(error)
  const ECDSAInvalidSignatureLengthSig = (0, utils.keccak256)(Buffer.from('ECDSAInvalidSignatureLength(uint256)')).slice(0, 10)
  const dataParams = '0x' + error.substring(10)

  if (parseError.sighash === ECDSAInvalidSignatureLengthSig) {
    const [res] = utils.defaultAbiCoder.decode(['uint256'], dataParams)
    return {
      message: 'The signature has an invalid length.',
      name:parseError.name,
      signature: parseError.signature,
      length: BigNumber.from(res).toNumber()
    }
  }  
  return null
}

// Run user operation through bundler
async function main() {
    Logger.info('Sending user operation...')
    const {factory, factoryData, salt} = getCfFactoryData(secondWallet.address)
    const senderCfAddress = await getSenderCfAddress(ethers.utils.hexConcat([factory,factoryData]))

    const ownerBalance = await provider.getBalance(secondWallet.address)
    const smartActBalance = await provider.getBalance(senderCfAddress)
    Logger.info({
      owner: {
        address: secondWallet.address,
        balance: `${ownerBalance.toString()} wei`, 
      },
      senderCfAddress: senderCfAddress,
      balance: `${smartActBalance.toString()} wei`,
      salt,
    },
    'Smart Account details:')

    // Deposit to the sender CF address
    const feeData = await provider.getFeeData()
    await sendDeposit(senderCfAddress, feeData)

    // build userOp
    const userOp = {
      sender: senderCfAddress,
      nonce: BigNumber.from(0).toHexString(),
      factory: factory,
      factoryData:factoryData,
      callData: getUserOpCallData(senderCfAddress),
      signature: dummySig,
    } as UserOperation

    // Estimate gas
    const gasEstimate = await bundlerProvider.send('eth_estimateUserOperationGas', [userOp, epAddress]).catch((error: any) => {
      const parseJson = JSON.parse(error.body)
      Logger.error({
        ...parseJson,
        parsedErrorData: decodeSCAccountRevertReason(parseJson.error.data)
      }, 'Failed to Estimate gas')
      throw new Error('Failed to estimate gas.')
    })
    Logger.info(gasEstimate, 'Gas Estimate')
    userOp.callGasLimit = BigNumber.from(gasEstimate.callGasLimit).toHexString()
    userOp.verificationGasLimit = BigNumber.from(1000000).toHexString()
    userOp.preVerificationGas = BigNumber.from(44848).toHexString()
    userOp.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas?.toHexString() ?? BigNumber.from(0).toHexString()
    userOp.maxFeePerGas = feeData.maxFeePerGas?.toHexString() ?? BigNumber.from(0).toHexString()

    // Sign userOp
    const userOpHashToSign = ethers.utils.arrayify(
        await epContract.getUserOpHash(packUserOp(userOp)),
    )
    const signature = await secondWallet.signMessage(userOpHashToSign)
    const signedUserOp = deepHexlify({ ...userOp, signature })

    // Send userOp
    Logger.info({signedUserOp}, 'Sending UserOp')
    const userOpHash = await bundlerProvider.send('eth_sendUserOperation', [signedUserOp, epAddress]).catch((error: any) => {
      const parseJson = JSON.parse(error.body)
      Logger.error(parseJson, 'Failed to send user operation.')
      throw new Error('Failed to send user operation.')
    })
    Logger.info({userOpHash}, 'UserOp hash:', )
}

main()
  .then(() => process.exit(0))
  .catch(() => {
    Logger.error('Script failed')
    process.exit(1)
})