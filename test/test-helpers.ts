import { BigNumberish } from 'ethers'

import { UserOperation } from '../src/types/index.js'
import { toJsonString } from '../src/utils/index.js'

export const mockUserOperationFactory = (
  sender: string,
  addFactory: boolean,
  nonce: number,
  paymaster?: {
    paymaster: string
    paymasterData: string
    paymasterPostOpGasLimit: BigNumberish
  },
): UserOperation => {
  const mockUserOperation: UserOperation = {
    sender: sender,
    nonce: nonce,
    factory: addFactory
      ? '0x0000000071727De22E5E9d8BAf0edAc6f37da032'
      : undefined,
    factoryData: addFactory ? '0x0000000000000000' : undefined,
    callData:
      '0xa9e966b7000000000000000000000000000000000000000000000000000000000010f447',
    callGasLimit: 0,
    verificationGasLimit: 0,
    preVerificationGas: 0,
    maxFeePerGas: 0,
    maxPriorityFeePerGas: 0,
    paymasterData: paymaster ? paymaster.paymasterData : '0x',
    signature: '0x',
    paymaster: paymaster ? paymaster.paymaster : '0x',
    paymasterVerificationGasLimit: '',
    paymasterPostOpGasLimit: paymaster ? paymaster.paymasterPostOpGasLimit : 0,
  }
  return mockUserOperation
}

export const mockEntryPointGetUserOpHash = (userOp: UserOperation): string => {
  const objString = toJsonString(userOp)
  let hash = 0

  if (objString.length === 0) {
    return hash.toString()
  }

  for (let i = 0; i < objString.length; i++) {
    const charCode = objString.charCodeAt(i)
    hash = (hash << 5) - hash + charCode
    hash |= 0 // Convert to 32-bit integer
  }

  return hash.toString()
}

export const mockBuildRelayUserOpParam = (
  addr: string,
  userOp: UserOperation,
  userOpHash: string,
) => {
  return {
    userOp,
    userOpHash,
    prefund: BigInt('1'),
    referencedContracts: {
      addresses: [],
      hash: '',
    },
    senderInfo: {
      addr,
      stake: BigInt('1'),
      unstakeDelaySec: BigInt('8600'),
    },
  }
}

export const MOCK_USER_OPERATION_EVENT = [
  '0x060186e28a01ec7132a8b7da3710396e01d666ce991b4d7577e514470c21ab08',
  '0xFC205D74E4921728c7Bb031FB625d6b29ec641aD',
  '0x0000000000000000000000000000000000000000',
  BigInt('0x00'),
  false,
  BigInt('0x44ac02f919dce0'),
  BigInt('0x0db560'),
  {
    blockNumber: 9029013,
    blockHash:
      '0x8e195b71a6599febbbd6f0348603f6e0a0c0ec1a93339f47474e22f5a24d3775',
    transactionIndex: 42,
    removed: false,
    address: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    data: '0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044ac02f919dce000000000000000000000000000000000000000000000000000000000000db560',
    topics: [
      '0x49628fd1471006c1482da88028e9ce4dbb080b815c9b0344d39e5a8e6ec1419f',
      '0x060186e28a01ec7132a8b7da3710396e01d666ce991b4d7577e514470c21ab08',
      '0x000000000000000000000000fc205d74e4921728c7bb031fb625d6b29ec641ad',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    ],
    transactionHash:
      '0x53651f0913c51ca9a04b706c003d0bacab12487b5a40feb7268ef197f073ebcc',
    logIndex: 113,
    event: 'UserOperationEvent',
    eventSignature:
      'UserOperationEvent(bytes32,address,address,uint256,bool,uint256,uint256)',
    args: [
      '0x060186e28a01ec7132a8b7da3710396e01d666ce991b4d7577e514470c21ab08',
      '0xFC205D74E4921728c7Bb031FB625d6b29ec641aD',
      '0x0000000000000000000000000000000000000000',
      [BigInt],
      false,
      [BigInt],
      [BigInt],
      {
        userOpHash:
          '0x060186e28a01ec7132a8b7da3710396e01d666ce991b4d7577e514470c21ab08',
      },
      { sender: '0xFC205D74E4921728c7Bb031FB625d6b29ec641aD' },
      { paymaster: '0x0000000000000000000000000000000000000000' },
      { nonce: BigInt('0x00') },
      { success: false },
      { actualGasCost: BigInt('0x44ac02f919dce0') },
      { actualGasUsed: BigInt('0x0db560') },
    ],
  },
]
