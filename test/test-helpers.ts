import { BigNumber, Wallet } from 'ethers'
import { UserOperation } from '../src/types'

export function mockUserOperationFactory(
  sender: string,
  nonce: number
): UserOperation {
  const mockUserOperation: UserOperation = {
    sender: sender,
    nonce: nonce,
    initCode: '0x04',
    callData: '0xa9e966b7000000000000000000000000000000000000000000000000000000000010f447',
    callGasLimit: 0,
    verificationGasLimit: 0,
    preVerificationGas: 0,
    maxFeePerGas: 0,
    maxPriorityFeePerGas: 0,
    paymasterAndData: '0x',
    signature: '0x',
  }
  return mockUserOperation
}

export function mockEntryPointGetUserOpHash(userOp: UserOperation): string {
  const objString = JSON.stringify(userOp)
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

export const MOCK_USER_OPERATION_EVENT = [
  '0x060186e28a01ec7132a8b7da3710396e01d666ce991b4d7577e514470c21ab08',
  '0xFC205D74E4921728c7Bb031FB625d6b29ec641aD',
  '0x0000000000000000000000000000000000000000',
  BigNumber.from('0x00'),
  false,
  BigNumber.from('0x44ac02f919dce0'),
  BigNumber.from('0x0db560'),
  {
    blockNumber: 9029013,
    blockHash: '0x8e195b71a6599febbbd6f0348603f6e0a0c0ec1a93339f47474e22f5a24d3775',
    transactionIndex: 42,
    removed: false,
    address: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    data: '0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044ac02f919dce000000000000000000000000000000000000000000000000000000000000db560',
    topics: [
      '0x49628fd1471006c1482da88028e9ce4dbb080b815c9b0344d39e5a8e6ec1419f',
      '0x060186e28a01ec7132a8b7da3710396e01d666ce991b4d7577e514470c21ab08',
      '0x000000000000000000000000fc205d74e4921728c7bb031fb625d6b29ec641ad',
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    ],
    transactionHash: '0x53651f0913c51ca9a04b706c003d0bacab12487b5a40feb7268ef197f073ebcc',
    logIndex: 113,
    event: 'UserOperationEvent',
    eventSignature: 'UserOperationEvent(bytes32,address,address,uint256,bool,uint256,uint256)',
    args: [
      '0x060186e28a01ec7132a8b7da3710396e01d666ce991b4d7577e514470c21ab08',
      '0xFC205D74E4921728c7Bb031FB625d6b29ec641aD',
      '0x0000000000000000000000000000000000000000',
      [BigNumber],
      false,
      [BigNumber],
      [BigNumber],
      {userOpHash: '0x060186e28a01ec7132a8b7da3710396e01d666ce991b4d7577e514470c21ab08'},
      {sender: '0xFC205D74E4921728c7Bb031FB625d6b29ec641aD'},
      {paymaster: '0x0000000000000000000000000000000000000000'},
      {nonce: BigNumber.from('0x00')},
      {success: false},
      {actualGasCost: BigNumber.from('0x44ac02f919dce0')},
      {actualGasUsed: BigNumber.from('0x0db560')}
    ]
  }
]

export function setTestConfig() {
  process.env = {
    ...process.env,
    MNEMONIC: 'test '.repeat(11) + 'junk',
    BENEFICIARY: '0xd21934eD8eAf27a67f0A70042Af50A1D6d195E81'
  }
  return {
    args: ['--network', 'hardhat']
  }
}

export const testWallet = Wallet.fromMnemonic('test '.repeat(11) + 'junk')
