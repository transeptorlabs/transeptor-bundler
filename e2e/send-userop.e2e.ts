import dotenv from 'dotenv'
import {
  Wallet,
  ethers,
  JsonRpcProvider,
  HDNodeWallet,
  Mnemonic,
  toBeHex,
  FeeData,
  keccak256,
  toUtf8Bytes,
  AbiCoder,
  Interface,
} from 'ethers'

import { IENTRY_POINT_ABI } from '../src/abis/index.js'
import { Logger } from '../src/logger/index.js'
import { UserOperation, UserOperationReceipt } from '../src/types/index.js'
import { packUserOp, deepHexlify, hexConcat } from '../src/utils/index.js'

import {
  globalCounterABI,
  simpleAccountABI,
  simpleAccountFactoryABI,
} from './abi.e2e.js'
dotenv.config()

const network: ethers.Network = new ethers.Network('localhost', BigInt(1337))
const provider = new JsonRpcProvider('http://localhost:8545', network, {
  staticNetwork: network,
})
const bundlerNode = new JsonRpcProvider('http://localhost:4337/rpc', network, {
  staticNetwork: network,
})
const dummySig =
  '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c'

// Derive the second account from the HDNode and create a new wallet for the second account
const hdNode = HDNodeWallet.fromMnemonic(
  Mnemonic.fromPhrase(process.env.TRANSEPTOR_E2E_TRANSEPTOR_MNEMONIC as string),
  // eslint-disable-next-line quotes
  "m/44'/60'/0'/0/1",
)
const secondWallet = new Wallet(hdNode.privateKey, provider).connect(provider)

// contract instances
const epAddress = process.env.TRANSEPTOR_ENTRYPOINT_ADDRESS as string
const simpleAccountFactoryAddress = process.env
  .TRANSEPTOR_E2E_SIMPLE_ACCOUNT_FACTORY as string
const globalCounterAddress = process.env.TRANSEPTOR_E2E_GLOBAL_COUNTER as string

const epContract = new ethers.Contract(
  epAddress,
  IENTRY_POINT_ABI,
  secondWallet,
)
const globalCounter = new ethers.Contract(
  globalCounterAddress,
  globalCounterABI,
  secondWallet,
)
const simpleAccountFactory = new ethers.Contract(
  simpleAccountFactoryAddress,
  simpleAccountFactoryABI,
  secondWallet,
)
const simpleAccountInterface = new Interface(simpleAccountABI)
const globalCounterInterface = new Interface(globalCounterABI)
const accountFactoryInterface = new Interface(simpleAccountFactoryABI)

const getCfFactoryData = async (owner: Wallet) => {
  const salt = BigInt(Math.floor(Math.random() * 10000000)).toString() // a random salt
  return {
    factory: await simpleAccountFactory.getAddress(),
    factoryData: accountFactoryInterface.encodeFunctionData('createAccount', [
      owner.address,
      salt,
    ]),
    salt,
  }
}

const getSenderCfAddress = async (initCode: string): Promise<string> => {
  try {
    await epContract.getSenderAddress(initCode)
  } catch (error: any) {
    if (
      error.errorArgs === null ||
      error.data === null ||
      error.errorName === null
    ) {
      Logger.error(error, 'Error must have errorArgs, data and errorName')
      throw error
    }

    const errorData = error.data as string
    const SenderAddressResult = keccak256(
      toUtf8Bytes('SenderAddressResult(address)'),
    ).slice(0, 10)
    if (!errorData.startsWith(SenderAddressResult)) {
      Logger.error(
        error,
        'Invalid error, looking for SenderAddressResult(address)',
      )
      throw error
    }

    const [senderAddress] = AbiCoder.defaultAbiCoder().decode(
      ['address'],
      '0x' + errorData.substring(10),
    )
    return senderAddress as string
  }
  throw new Error('must handle revert')
}

const getUserOpCallData = (globalCounterAddress: string) => {
  return simpleAccountInterface.encodeFunctionData('execute', [
    globalCounterAddress, // to
    BigInt(0).toString(), // value
    globalCounterInterface.encodeFunctionData('increment', []), // data
  ])
}

const sendDeposit = async (senderAddress: string, feeData: FeeData) => {
  const depositInWei = ethers.parseEther('1')
  const { to, data, value } = await epContract.depositTo.populateTransaction(
    senderAddress,
    { value: depositInWei.toString() },
  )
  const nonce = await secondWallet.getNonce('pending')

  const tx: ethers.TransactionRequest = {
    to,
    data,
    value,
    from: secondWallet.address,
    nonce,
    type: 2,
    maxPriorityFeePerGas: toBeHex(feeData.maxPriorityFeePerGas ?? BigInt(0)),
    maxFeePerGas: toBeHex(feeData.maxFeePerGas ?? BigInt(0)),
  }
  const res = await secondWallet.sendTransaction(tx)
  await res.wait()

  const senderDeposit = await getDeposit(senderAddress)
  if (senderDeposit !== depositInWei) {
    Logger.error(
      `Deposit failed: ${senderDeposit.toString()} != ${depositInWei.toString()}`,
    )
    throw new Error('Deposit failed')
  }
  Logger.info(`Sender deposit: ${await getDeposit(senderAddress)} wei`)
}

const getDeposit = async (accountAddr: string): Promise<bigint> => {
  return epContract.balanceOf(accountAddr)
}

const decodeSCAccountRevertReason = (error: string): any => {
  const parseError = simpleAccountInterface.parseError(error)
  const ECDSAInvalidSignatureLengthSig = keccak256(
    toUtf8Bytes('ECDSAInvalidSignatureLength(uint256)'),
  ).slice(0, 10)
  const dataParams = '0x' + error.substring(10)
  if (!parseError) {
    return {
      message: 'Unknown error',
      error,
    }
  }

  if (parseError.signature === ECDSAInvalidSignatureLengthSig) {
    const [res] = AbiCoder.defaultAbiCoder().decode(['uint256'], dataParams)
    return {
      message: 'The signature has an invalid length.',
      name: parseError.name,
      signature: parseError.signature,
      length: Number(BigInt(res)),
    }
  }
  return {
    message: 'Unknown error',
    error,
  }
}

const estimateUserOpGas = async (
  userOp: UserOperation,
): Promise<UserOperation> => {
  const gasEstimate = await bundlerNode
    .send('eth_estimateUserOperationGas', [userOp, epAddress])
    .catch((error: any) => {
      const parseJson = JSON.parse(error.body)
      Logger.error(
        {
          ...parseJson,
          parsedErrorData: decodeSCAccountRevertReason(parseJson.error.data),
        },
        'Failed to Estimate gas',
      )
      throw new Error('Failed to estimate gas.')
    })

  Logger.info(gasEstimate, 'Gas Estimate')
  return {
    ...userOp,
    callGasLimit: toBeHex(BigInt(gasEstimate.callGasLimit)),
    verificationGasLimit: toBeHex(BigInt(gasEstimate.verificationGasLimit)),
    preVerificationGas: toBeHex(BigInt(gasEstimate.preVerificationGas)),
  }
}

const signUserOp = async (userOp: UserOperation): Promise<UserOperation> => {
  const userOpHashToSign = ethers.getBytes(
    await epContract.getUserOpHash(packUserOp(userOp)),
  )
  const signature = await secondWallet.signMessage(userOpHashToSign)
  return {
    ...userOp,
    signature,
  }
}

const waitForReceipt = async (
  userOpHash: string,
): Promise<UserOperationReceipt> => {
  Logger.info({ userOpHash }, 'Waiting for user operation receipt...')

  let result: UserOperationReceipt | null = null
  while (result === null) {
    Logger.info('Polling bundler...')
    result = await bundlerNode
      .send('eth_getUserOperationReceipt', [userOpHash])
      .catch((error: any) => {
        const parseJson = JSON.parse(error.body)
        Logger.error(parseJson, 'Failed to get user operation receipt')
        throw new Error('Failed to get user operation receipt.')
      })

    if (result === null) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
  return result
}

const parseUserOpRevertReason = (
  receipt: UserOperationReceipt,
  sender: string,
): any => {
  // receipt.logs should have logs generated by this UserOperation
  // receipt.receipt.logs should have logs generated the for the entire bundle, not only for this UserOperation.
  for (const log of receipt.logs) {
    if (log.address === sender) {
      try {
        const parsedLog = simpleAccountInterface.parseLog(log)
        if (!parsedLog) {
          continue
        }
        Logger.info(parsedLog, 'Parsed log')
      } catch (error: any) {
        Logger.error(error, 'Failed to parse error')
      }
    }
  }

  return 'Unknown error'
}

/**
 * Run user operation through bundler
 */
async function main() {
  Logger.info('Sending user operation...')
  const { factory, factoryData, salt } = await getCfFactoryData(secondWallet)
  const senderCfAddress = await getSenderCfAddress(
    hexConcat([factory, factoryData]),
  )

  const [ownerBalance, smartActBalance, countBefore, feeData] =
    await Promise.all([
      provider.getBalance(secondWallet.address),
      provider.getBalance(senderCfAddress),
      globalCounter.currentCount(),
      provider.getFeeData(),
    ])
  Logger.info(
    {
      owner: {
        address: secondWallet.address,
        balance: `${ownerBalance.toString()} wei`,
      },
      senderCfAddress: senderCfAddress,
      balance: `${smartActBalance.toString()} wei`,
      countBefore,
      salt,
    },
    'Smart Account details:',
  )

  // Deposit to the sender CF address
  await sendDeposit(senderCfAddress, feeData)

  // build userOp
  const userOp = await estimateUserOpGas({
    sender: senderCfAddress,
    nonce: toBeHex(BigInt(0)),
    factory: factory,
    factoryData: factoryData,
    callData: getUserOpCallData(await globalCounter.getAddress()),
    maxPriorityFeePerGas: toBeHex(feeData.maxPriorityFeePerGas ?? BigInt(0)),
    maxFeePerGas: toBeHex(feeData.maxFeePerGas ?? BigInt(0)),
    signature: dummySig,
  } as UserOperation)
  const signedUserOp = await signUserOp(userOp)

  // Send userOp
  Logger.info({ signedUserOp }, 'Sending UserOp to increment Global Counter...')
  const userOpHash = await bundlerNode
    .send('eth_sendUserOperation', [deepHexlify(signedUserOp), epAddress])
    .catch((error: any) => {
      const parseJson = JSON.parse(error.body)
      Logger.error(parseJson, 'Failed to send user operation.')
      throw new Error('Failed to send user operation.')
    })
  Logger.info({ userOpHash }, 'UserOp hash:')

  const res = await bundlerNode
    .send('debug_bundler_sendBundleNow', [])
    .catch((error: any) => {
      const parseJson = JSON.parse(error.body)
      Logger.error(parseJson, 'Failed to send bundle now.')
      throw new Error('Failed to send bundle now.')
    })
  Logger.info({ res }, 'Sending bundle now...')

  // Wait for userOp receipt
  const receipt = await waitForReceipt(userOpHash)
  if (!receipt.success) {
    const revertReason = parseUserOpRevertReason(receipt, senderCfAddress)
    Logger.error({ revertReason }, 'UserOp revert reason:')
    throw new Error('UserOp failed')
  }

  // Check that the global counter has been incremented by reading the currentCount value
  const countAfter = (await globalCounter.currentCount()) as bigint
  Logger.info(
    {
      countBefore: (countBefore as bigint).toString(),
      countAfter: countAfter.toString(),
    },
    'Global Counter count info:',
  )
  if ((countBefore as bigint) + BigInt(1) !== countAfter) {
    throw new Error('UserOp failed to increment Global counter')
  }
}

main()
  .then(() => process.exit(0))
  .catch((err: any) => {
    Logger.error(err, 'Script failed')
    process.exit(1)
  })
