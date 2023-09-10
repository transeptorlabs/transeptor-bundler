import { ethers, BigNumber, BytesLike } from 'ethers'
import { hexlify, hexZeroPad } from 'ethers/lib/utils'
import { BigNumberish } from 'ethers/lib/ethers'

export function isValidAddress(address: string) {
  return ethers.utils.isAddress(address)
}

export function tostr (s: BigNumberish): string {
  return BigNumber.from(s).toString()
}

export function toBytes32 (b: BytesLike | number): string {
  return hexZeroPad(hexlify(b).toLowerCase(), 32)
}

/**
* create a dictionary object with given keys
* @param keys the property names of the returned object
* @param mapper mapper from key to property value
* @param filter if exists, must return true to add keys
*/
export function mapOf<T> (keys: Iterable<string>, mapper: (key: string) => T, filter?: (key: string) => boolean): { [key: string]: T } {
  const ret: { [key: string]: T } = {}
  for (const key of keys) {
    if (filter == null || filter(key)) {
      ret[key] = mapper(key)
    }
  }
  return ret
}

// contract abi are taken from @account-abstraction/contracts
export const IENTRY_POINT_ABI = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'preOpGas',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'paid',
        type: 'uint256',
      },
      {
        internalType: 'uint48',
        name: 'validAfter',
        type: 'uint48',
      },
      {
        internalType: 'uint48',
        name: 'validUntil',
        type: 'uint48',
      },
      {
        internalType: 'bool',
        name: 'targetSuccess',
        type: 'bool',
      },
      {
        internalType: 'bytes',
        name: 'targetResult',
        type: 'bytes',
      },
    ],
    name: 'ExecutionResult',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'opIndex',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: 'reason',
        type: 'string',
      },
    ],
    name: 'FailedOp',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
    ],
    name: 'SenderAddressResult',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'aggregator',
        type: 'address',
      },
    ],
    name: 'SignatureValidationFailed',
    type: 'error',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'preOpGas',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'prefund',
            type: 'uint256',
          },
          {
            internalType: 'bool',
            name: 'sigFailed',
            type: 'bool',
          },
          {
            internalType: 'uint48',
            name: 'validAfter',
            type: 'uint48',
          },
          {
            internalType: 'uint48',
            name: 'validUntil',
            type: 'uint48',
          },
          {
            internalType: 'bytes',
            name: 'paymasterContext',
            type: 'bytes',
          },
        ],
        internalType: 'struct IEntryPoint.ReturnInfo',
        name: 'returnInfo',
        type: 'tuple',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'stake',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'unstakeDelaySec',
            type: 'uint256',
          },
        ],
        internalType: 'struct IStakeManager.StakeInfo',
        name: 'senderInfo',
        type: 'tuple',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'stake',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'unstakeDelaySec',
            type: 'uint256',
          },
        ],
        internalType: 'struct IStakeManager.StakeInfo',
        name: 'factoryInfo',
        type: 'tuple',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'stake',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'unstakeDelaySec',
            type: 'uint256',
          },
        ],
        internalType: 'struct IStakeManager.StakeInfo',
        name: 'paymasterInfo',
        type: 'tuple',
      },
    ],
    name: 'ValidationResult',
    type: 'error',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'preOpGas',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'prefund',
            type: 'uint256',
          },
          {
            internalType: 'bool',
            name: 'sigFailed',
            type: 'bool',
          },
          {
            internalType: 'uint48',
            name: 'validAfter',
            type: 'uint48',
          },
          {
            internalType: 'uint48',
            name: 'validUntil',
            type: 'uint48',
          },
          {
            internalType: 'bytes',
            name: 'paymasterContext',
            type: 'bytes',
          },
        ],
        internalType: 'struct IEntryPoint.ReturnInfo',
        name: 'returnInfo',
        type: 'tuple',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'stake',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'unstakeDelaySec',
            type: 'uint256',
          },
        ],
        internalType: 'struct IStakeManager.StakeInfo',
        name: 'senderInfo',
        type: 'tuple',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'stake',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'unstakeDelaySec',
            type: 'uint256',
          },
        ],
        internalType: 'struct IStakeManager.StakeInfo',
        name: 'factoryInfo',
        type: 'tuple',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'stake',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'unstakeDelaySec',
            type: 'uint256',
          },
        ],
        internalType: 'struct IStakeManager.StakeInfo',
        name: 'paymasterInfo',
        type: 'tuple',
      },
      {
        components: [
          {
            internalType: 'address',
            name: 'aggregator',
            type: 'address',
          },
          {
            components: [
              {
                internalType: 'uint256',
                name: 'stake',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'unstakeDelaySec',
                type: 'uint256',
              },
            ],
            internalType: 'struct IStakeManager.StakeInfo',
            name: 'stakeInfo',
            type: 'tuple',
          },
        ],
        internalType: 'struct IEntryPoint.AggregatorStakeInfo',
        name: 'aggregatorInfo',
        type: 'tuple',
      },
    ],
    name: 'ValidationResultWithAggregation',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'userOpHash',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'factory',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'paymaster',
        type: 'address',
      },
    ],
    name: 'AccountDeployed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [],
    name: 'BeforeExecution',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'totalDeposit',
        type: 'uint256',
      },
    ],
    name: 'Deposited',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'aggregator',
        type: 'address',
      },
    ],
    name: 'SignatureAggregatorChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'totalStaked',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'unstakeDelaySec',
        type: 'uint256',
      },
    ],
    name: 'StakeLocked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'withdrawTime',
        type: 'uint256',
      },
    ],
    name: 'StakeUnlocked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'withdrawAddress',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'StakeWithdrawn',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'userOpHash',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'paymaster',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'success',
        type: 'bool',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'actualGasCost',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'actualGasUsed',
        type: 'uint256',
      },
    ],
    name: 'UserOperationEvent',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'userOpHash',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'revertReason',
        type: 'bytes',
      },
    ],
    name: 'UserOperationRevertReason',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'withdrawAddress',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'Withdrawn',
    type: 'event',
  },
  {
    inputs: [],
    name: 'SIG_VALIDATION_FAILED',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes',
        name: 'initCode',
        type: 'bytes',
      },
      {
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        internalType: 'bytes',
        name: 'paymasterAndData',
        type: 'bytes',
      },
    ],
    name: '_validateSenderAndPaymaster',
    outputs: [],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint32',
        name: 'unstakeDelaySec',
        type: 'uint32',
      },
    ],
    name: 'addStake',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'depositTo',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'deposits',
    outputs: [
      {
        internalType: 'uint112',
        name: 'deposit',
        type: 'uint112',
      },
      {
        internalType: 'bool',
        name: 'staked',
        type: 'bool',
      },
      {
        internalType: 'uint112',
        name: 'stake',
        type: 'uint112',
      },
      {
        internalType: 'uint32',
        name: 'unstakeDelaySec',
        type: 'uint32',
      },
      {
        internalType: 'uint48',
        name: 'withdrawTime',
        type: 'uint48',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'getDepositInfo',
    outputs: [
      {
        components: [
          {
            internalType: 'uint112',
            name: 'deposit',
            type: 'uint112',
          },
          {
            internalType: 'bool',
            name: 'staked',
            type: 'bool',
          },
          {
            internalType: 'uint112',
            name: 'stake',
            type: 'uint112',
          },
          {
            internalType: 'uint32',
            name: 'unstakeDelaySec',
            type: 'uint32',
          },
          {
            internalType: 'uint48',
            name: 'withdrawTime',
            type: 'uint48',
          },
        ],
        internalType: 'struct IStakeManager.DepositInfo',
        name: 'info',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        internalType: 'uint192',
        name: 'key',
        type: 'uint192',
      },
    ],
    name: 'getNonce',
    outputs: [
      {
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes',
        name: 'initCode',
        type: 'bytes',
      },
    ],
    name: 'getSenderAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'sender',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'initCode',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'callData',
            type: 'bytes',
          },
          {
            internalType: 'uint256',
            name: 'callGasLimit',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'verificationGasLimit',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'preVerificationGas',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxFeePerGas',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxPriorityFeePerGas',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'paymasterAndData',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
        ],
        internalType: 'struct UserOperation',
        name: 'userOp',
        type: 'tuple',
      },
    ],
    name: 'getUserOpHash',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: 'address',
                name: 'sender',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'nonce',
                type: 'uint256',
              },
              {
                internalType: 'bytes',
                name: 'initCode',
                type: 'bytes',
              },
              {
                internalType: 'bytes',
                name: 'callData',
                type: 'bytes',
              },
              {
                internalType: 'uint256',
                name: 'callGasLimit',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'verificationGasLimit',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'preVerificationGas',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'maxFeePerGas',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'maxPriorityFeePerGas',
                type: 'uint256',
              },
              {
                internalType: 'bytes',
                name: 'paymasterAndData',
                type: 'bytes',
              },
              {
                internalType: 'bytes',
                name: 'signature',
                type: 'bytes',
              },
            ],
            internalType: 'struct UserOperation[]',
            name: 'userOps',
            type: 'tuple[]',
          },
          {
            internalType: 'contract IAggregator',
            name: 'aggregator',
            type: 'address',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
        ],
        internalType: 'struct IEntryPoint.UserOpsPerAggregator[]',
        name: 'opsPerAggregator',
        type: 'tuple[]',
      },
      {
        internalType: 'address payable',
        name: 'beneficiary',
        type: 'address',
      },
    ],
    name: 'handleAggregatedOps',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'sender',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'initCode',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'callData',
            type: 'bytes',
          },
          {
            internalType: 'uint256',
            name: 'callGasLimit',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'verificationGasLimit',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'preVerificationGas',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxFeePerGas',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxPriorityFeePerGas',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'paymasterAndData',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
        ],
        internalType: 'struct UserOperation[]',
        name: 'ops',
        type: 'tuple[]',
      },
      {
        internalType: 'address payable',
        name: 'beneficiary',
        type: 'address',
      },
    ],
    name: 'handleOps',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint192',
        name: 'key',
        type: 'uint192',
      },
    ],
    name: 'incrementNonce',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes',
        name: 'callData',
        type: 'bytes',
      },
      {
        components: [
          {
            components: [
              {
                internalType: 'address',
                name: 'sender',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'nonce',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'callGasLimit',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'verificationGasLimit',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'preVerificationGas',
                type: 'uint256',
              },
              {
                internalType: 'address',
                name: 'paymaster',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'maxFeePerGas',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'maxPriorityFeePerGas',
                type: 'uint256',
              },
            ],
            internalType: 'struct EntryPoint.MemoryUserOp',
            name: 'mUserOp',
            type: 'tuple',
          },
          {
            internalType: 'bytes32',
            name: 'userOpHash',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'prefund',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'contextOffset',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'preOpGas',
            type: 'uint256',
          },
        ],
        internalType: 'struct EntryPoint.UserOpInfo',
        name: 'opInfo',
        type: 'tuple',
      },
      {
        internalType: 'bytes',
        name: 'context',
        type: 'bytes',
      },
    ],
    name: 'innerHandleOp',
    outputs: [
      {
        internalType: 'uint256',
        name: 'actualGasCost',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
      {
        internalType: 'uint192',
        name: '',
        type: 'uint192',
      },
    ],
    name: 'nonceSequenceNumber',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'sender',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'initCode',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'callData',
            type: 'bytes',
          },
          {
            internalType: 'uint256',
            name: 'callGasLimit',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'verificationGasLimit',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'preVerificationGas',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxFeePerGas',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxPriorityFeePerGas',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'paymasterAndData',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
        ],
        internalType: 'struct UserOperation',
        name: 'op',
        type: 'tuple',
      },
      {
        internalType: 'address',
        name: 'target',
        type: 'address',
      },
      {
        internalType: 'bytes',
        name: 'targetCallData',
        type: 'bytes',
      },
    ],
    name: 'simulateHandleOp',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'sender',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'initCode',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'callData',
            type: 'bytes',
          },
          {
            internalType: 'uint256',
            name: 'callGasLimit',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'verificationGasLimit',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'preVerificationGas',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxFeePerGas',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxPriorityFeePerGas',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'paymasterAndData',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
        ],
        internalType: 'struct UserOperation',
        name: 'userOp',
        type: 'tuple',
      },
    ],
    name: 'simulateValidation',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unlockStake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address payable',
        name: 'withdrawAddress',
        type: 'address',
      },
    ],
    name: 'withdrawStake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address payable',
        name: 'withdrawAddress',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'withdrawAmount',
        type: 'uint256',
      },
    ],
    name: 'withdrawTo',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    stateMutability: 'payable',
    type: 'receive',
  },
]

export const IPAYMASTER_ABI = [
  {
    inputs: [
      {
        internalType: 'enum IPaymaster.PostOpMode',
        name: 'mode',
        type: 'uint8',
      },
      {
        internalType: 'bytes',
        name: 'context',
        type: 'bytes',
      },
      {
        internalType: 'uint256',
        name: 'actualGasCost',
        type: 'uint256',
      },
    ],
    name: 'postOp',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'sender',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'initCode',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'callData',
            type: 'bytes',
          },
          {
            internalType: 'uint256',
            name: 'callGasLimit',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'verificationGasLimit',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'preVerificationGas',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxFeePerGas',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxPriorityFeePerGas',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'paymasterAndData',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
        ],
        internalType: 'struct UserOperation',
        name: 'userOp',
        type: 'tuple',
      },
      {
        internalType: 'bytes32',
        name: 'userOpHash',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'maxCost',
        type: 'uint256',
      },
    ],
    name: 'validatePaymasterUserOp',
    outputs: [
      {
        internalType: 'bytes',
        name: 'context',
        type: 'bytes',
      },
      {
        internalType: 'uint256',
        name: 'validationData',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

export const SENDER_CREATOR_ABI = [
  {
    inputs: [
      {
        internalType: 'bytes',
        name: 'initCode',
        type: 'bytes',
      },
    ],
    name: 'createSender',
    outputs: [
      {
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

export const IACCOUNT_ABI = [
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'sender',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'initCode',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'callData',
            type: 'bytes',
          },
          {
            internalType: 'uint256',
            name: 'callGasLimit',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'verificationGasLimit',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'preVerificationGas',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxFeePerGas',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxPriorityFeePerGas',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'paymasterAndData',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
        ],
        internalType: 'struct UserOperation',
        name: 'userOp',
        type: 'tuple',
      },
      {
        internalType: 'bytes32',
        name: 'userOpHash',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'missingAccountFunds',
        type: 'uint256',
      },
    ],
    name: 'validateUserOp',
    outputs: [
      {
        internalType: 'uint256',
        name: 'validationData',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

export const TEST_OPCODE_ACCOUNT_FACTORY_ABI = [
  {
    inputs: [
      {
        internalType: "string",
        name: "rule",
        type: "string",
      },
    ],
    name: "create",
    outputs: [
      {
        internalType: "contract TestOpcodesAccount",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
]

export const TEST_OPCODE_ACCOUNT_ABI =  [
  {
    anonymous: false,
    inputs: [],
    name: "ExecutionMessage",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "oldState",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newState",
        type: "uint256",
      },
    ],
    name: "State",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "eventSender",
        type: "address",
      },
    ],
    name: "TestMessage",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "contract IEntryPoint",
        name: "entryPoint",
        type: "address",
      },
    ],
    name: "addStake",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "execEvent",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "enum IPaymaster.PostOpMode",
        name: "",
        type: "uint8",
      },
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "postOp",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "rule",
        type: "string",
      },
    ],
    name: "runRule",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_state",
        type: "uint256",
      },
    ],
    name: "setState",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "sender",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "nonce",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "initCode",
            type: "bytes",
          },
          {
            internalType: "bytes",
            name: "callData",
            type: "bytes",
          },
          {
            internalType: "uint256",
            name: "callGasLimit",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "verificationGasLimit",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "preVerificationGas",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "maxFeePerGas",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "maxPriorityFeePerGas",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "paymasterAndData",
            type: "bytes",
          },
          {
            internalType: "bytes",
            name: "signature",
            type: "bytes",
          },
        ],
        internalType: "struct UserOperation",
        name: "userOp",
        type: "tuple",
      },
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "validatePaymasterUserOp",
    outputs: [
      {
        internalType: "bytes",
        name: "context",
        type: "bytes",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "sender",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "nonce",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "initCode",
            type: "bytes",
          },
          {
            internalType: "bytes",
            name: "callData",
            type: "bytes",
          },
          {
            internalType: "uint256",
            name: "callGasLimit",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "verificationGasLimit",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "preVerificationGas",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "maxFeePerGas",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "maxPriorityFeePerGas",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "paymasterAndData",
            type: "bytes",
          },
          {
            internalType: "bytes",
            name: "signature",
            type: "bytes",
          },
        ],
        internalType: "struct UserOperation",
        name: "userOp",
        type: "tuple",
      },
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "missingAccountFunds",
        type: "uint256",
      },
    ],
    name: "validateUserOp",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
]

export const TEST_STORAGE_ACCOUNT_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "oldState",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newState",
        type: "uint256",
      },
    ],
    name: "State",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "eventSender",
        type: "address",
      },
    ],
    name: "TestMessage",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "contract IEntryPoint",
        name: "entryPoint",
        type: "address",
      },
    ],
    name: "addStake",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "coin",
    outputs: [
      {
        internalType: "contract TestCoin",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "enum IPaymaster.PostOpMode",
        name: "",
        type: "uint8",
      },
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "postOp",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "rule",
        type: "string",
      },
    ],
    name: "runRule",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract TestCoin",
        name: "_coin",
        type: "address",
      },
    ],
    name: "setCoin",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_state",
        type: "uint256",
      },
    ],
    name: "setState",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "sender",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "nonce",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "initCode",
            type: "bytes",
          },
          {
            internalType: "bytes",
            name: "callData",
            type: "bytes",
          },
          {
            internalType: "uint256",
            name: "callGasLimit",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "verificationGasLimit",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "preVerificationGas",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "maxFeePerGas",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "maxPriorityFeePerGas",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "paymasterAndData",
            type: "bytes",
          },
          {
            internalType: "bytes",
            name: "signature",
            type: "bytes",
          },
        ],
        internalType: "struct UserOperation",
        name: "userOp",
        type: "tuple",
      },
      {
        internalType: "bytes32",
        name: "userOpHash",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "maxCost",
        type: "uint256",
      },
    ],
    name: "validatePaymasterUserOp",
    outputs: [
      {
        internalType: "bytes",
        name: "context",
        type: "bytes",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "sender",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "nonce",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "initCode",
            type: "bytes",
          },
          {
            internalType: "bytes",
            name: "callData",
            type: "bytes",
          },
          {
            internalType: "uint256",
            name: "callGasLimit",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "verificationGasLimit",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "preVerificationGas",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "maxFeePerGas",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "maxPriorityFeePerGas",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "paymasterAndData",
            type: "bytes",
          },
          {
            internalType: "bytes",
            name: "signature",
            type: "bytes",
          },
        ],
        internalType: "struct UserOperation",
        name: "userOp",
        type: "tuple",
      },
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "missingAccountFunds",
        type: "uint256",
      },
    ],
    name: "validateUserOp",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
]

// helper contracts
export const GET_CODE_HASH_ABI = [
  {
    inputs: [
      {
        internalType: 'address[]',
        name: 'addresses',
        type: 'address[]',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'hash',
        type: 'bytes32',
      },
    ],
    name: 'CodeHashesResult',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address[]',
        name: 'addresses',
        type: 'address[]',
      },
    ],
    name: 'getCodeHashes',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
]

export const GET_CODE_HASH_BYTECODE =
  '0x60806040523480156200001157600080fd5b50604051620005aa380380620005aa833981810160405281019062000037919062000379565b62000048816200008660201b60201c565b6040517f091cd0050000000000000000000000000000000000000000000000000000000081526004016200007d9190620003e5565b60405180910390fd5b600080825167ffffffffffffffff811115620000a757620000a6620001b5565b5b604051908082528060200260200182016040528015620000d65781602001602082028036833780820191505090505b50905060005b83518110156200015357838181518110620000fc57620000fb62000402565b5b602002602001015173ffffffffffffffffffffffffffffffffffffffff163f82828151811062000131576200013062000402565b5b60200260200101818152505080806200014a906200046a565b915050620000dc565b5060008160405160200162000169919062000585565b6040516020818303038152906040529050808051906020012092505050919050565b6000604051905090565b600080fd5b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b620001ef82620001a4565b810181811067ffffffffffffffff82111715620002115762000210620001b5565b5b80604052505050565b6000620002266200018b565b9050620002348282620001e4565b919050565b600067ffffffffffffffff821115620002575762000256620001b5565b5b602082029050602081019050919050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006200029a826200026d565b9050919050565b620002ac816200028d565b8114620002b857600080fd5b50565b600081519050620002cc81620002a1565b92915050565b6000620002e9620002e38462000239565b6200021a565b905080838252602082019050602084028301858111156200030f576200030e62000268565b5b835b818110156200033c5780620003278882620002bb565b84526020840193505060208101905062000311565b5050509392505050565b600082601f8301126200035e576200035d6200019f565b5b815162000370848260208601620002d2565b91505092915050565b60006020828403121562000392576200039162000195565b5b600082015167ffffffffffffffff811115620003b357620003b26200019a565b5b620003c18482850162000346565b91505092915050565b6000819050919050565b620003df81620003ca565b82525050565b6000602082019050620003fc6000830184620003d4565b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000819050919050565b6000620004778262000460565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8203620004ac57620004ab62000431565b5b600182019050919050565b600081519050919050565b600082825260208201905092915050565b6000819050602082019050919050565b620004ee81620003ca565b82525050565b6000620005028383620004e3565b60208301905092915050565b6000602082019050919050565b60006200052882620004b7565b620005348185620004c2565b93506200054183620004d3565b8060005b83811015620005785781516200055c8882620004f4565b975062000569836200050e565b92505060018101905062000545565b5085935050505092915050565b60006020820190508181036000830152620005a181846200051b565b90509291505056fe'

export const GET_USEROP_HASHES_ABI = [
  {
    inputs: [
      {
        internalType: 'contract IEntryPoint',
        name: 'entryPoint',
        type: 'address',
      },
      {
        components: [
          {
            internalType: 'address',
            name: 'sender',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'initCode',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'callData',
            type: 'bytes',
          },
          {
            internalType: 'uint256',
            name: 'callGasLimit',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'verificationGasLimit',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'preVerificationGas',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxFeePerGas',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxPriorityFeePerGas',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'paymasterAndData',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
        ],
        internalType: 'struct UserOperation[]',
        name: 'userOps',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      {
        internalType: 'bytes32[]',
        name: 'userOpHashes',
        type: 'bytes32[]',
      },
    ],
    name: 'UserOpHashesResult',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'contract IEntryPoint',
        name: 'entryPoint',
        type: 'address',
      },
      {
        components: [
          {
            internalType: 'address',
            name: 'sender',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'initCode',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'callData',
            type: 'bytes',
          },
          {
            internalType: 'uint256',
            name: 'callGasLimit',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'verificationGasLimit',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'preVerificationGas',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxFeePerGas',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxPriorityFeePerGas',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'paymasterAndData',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
        ],
        internalType: 'struct UserOperation[]',
        name: 'userOps',
        type: 'tuple[]',
      },
    ],
    name: 'getUserOpHashes',
    outputs: [
      {
        internalType: 'bytes32[]',
        name: 'ret',
        type: 'bytes32[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
]
  
export const GET_USEROP_HASHES_BYTECODE = 
  '0x608060405234801562000010575f80fd5b5060405162000ace38038062000ace8339818101604052810190620000369190620006bd565b6200004882826200008660201b60201c565b6040517f11e6f5a00000000000000000000000000000000000000000000000000000000081526004016200007d9190620007f1565b60405180910390fd5b6060815167ffffffffffffffff811115620000a657620000a562000256565b5b604051908082528060200260200182016040528015620000d55781602001602082028036833780820191505090505b5090505f5b8251811015620001b6578373ffffffffffffffffffffffffffffffffffffffff1663a619353184838151811062000116576200011562000813565b5b60200260200101516040518263ffffffff1660e01b81526004016200013c9190620009d3565b602060405180830381865afa15801562000158573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906200017e919062000a24565b82828151811062000194576200019362000813565b5b6020026020010181815250508080620001ad9062000a81565b915050620000da565b5092915050565b5f604051905090565b5f80fd5b5f80fd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f620001f982620001ce565b9050919050565b5f6200020c82620001ed565b9050919050565b6200021e8162000200565b811462000229575f80fd5b50565b5f815190506200023c8162000213565b92915050565b5f80fd5b5f601f19601f8301169050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b6200028e8262000246565b810181811067ffffffffffffffff82111715620002b057620002af62000256565b5b80604052505050565b5f620002c4620001bd565b9050620002d2828262000283565b919050565b5f67ffffffffffffffff821115620002f457620002f362000256565b5b602082029050602081019050919050565b5f80fd5b5f80fd5b5f80fd5b6200031c81620001ed565b811462000327575f80fd5b50565b5f815190506200033a8162000311565b92915050565b5f819050919050565b620003548162000340565b81146200035f575f80fd5b50565b5f81519050620003728162000349565b92915050565b5f80fd5b5f67ffffffffffffffff82111562000399576200039862000256565b5b620003a48262000246565b9050602081019050919050565b5f5b83811015620003d0578082015181840152602081019050620003b3565b5f8484015250505050565b5f620003f1620003eb846200037c565b620002b9565b90508281526020810184848401111562000410576200040f62000378565b5b6200041d848285620003b1565b509392505050565b5f82601f8301126200043c576200043b62000242565b5b81516200044e848260208601620003db565b91505092915050565b5f610160828403121562000470576200046f62000309565b5b6200047d610160620002b9565b90505f6200048e848285016200032a565b5f830152506020620004a38482850162000362565b602083015250604082015167ffffffffffffffff811115620004ca57620004c96200030d565b5b620004d88482850162000425565b604083015250606082015167ffffffffffffffff811115620004ff57620004fe6200030d565b5b6200050d8482850162000425565b6060830152506080620005238482850162000362565b60808301525060a0620005398482850162000362565b60a08301525060c06200054f8482850162000362565b60c08301525060e0620005658482850162000362565b60e0830152506101006200057c8482850162000362565b6101008301525061012082015167ffffffffffffffff811115620005a557620005a46200030d565b5b620005b38482850162000425565b6101208301525061014082015167ffffffffffffffff811115620005dc57620005db6200030d565b5b620005ea8482850162000425565b6101408301525092915050565b5f6200060d6200060784620002d7565b620002b9565b9050808382526020820190506020840283018581111562000633576200063262000305565b5b835b818110156200068157805167ffffffffffffffff8111156200065c576200065b62000242565b5b8086016200066b898262000457565b8552602085019450505060208101905062000635565b5050509392505050565b5f82601f830112620006a257620006a162000242565b5b8151620006b4848260208601620005f7565b91505092915050565b5f8060408385031215620006d657620006d5620001c6565b5b5f620006e5858286016200022c565b925050602083015167ffffffffffffffff811115620007095762000708620001ca565b5b62000717858286016200068b565b9150509250929050565b5f81519050919050565b5f82825260208201905092915050565b5f819050602082019050919050565b5f819050919050565b6200075e816200074a565b82525050565b5f62000771838362000753565b60208301905092915050565b5f602082019050919050565b5f620007958262000721565b620007a181856200072b565b9350620007ae836200073b565b805f5b83811015620007e4578151620007c8888262000764565b9750620007d5836200077d565b925050600181019050620007b1565b5085935050505092915050565b5f6020820190508181035f8301526200080b818462000789565b905092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b6200084b81620001ed565b82525050565b6200085c8162000340565b82525050565b5f81519050919050565b5f82825260208201905092915050565b5f620008888262000862565b6200089481856200086c565b9350620008a6818560208601620003b1565b620008b18162000246565b840191505092915050565b5f61016083015f830151620008d45f86018262000840565b506020830151620008e9602086018262000851565b50604083015184820360408601526200090382826200087c565b915050606083015184820360608601526200091f82826200087c565b915050608083015162000936608086018262000851565b5060a08301516200094b60a086018262000851565b5060c08301516200096060c086018262000851565b5060e08301516200097560e086018262000851565b506101008301516200098c61010086018262000851565b50610120830151848203610120860152620009a882826200087c565b915050610140830151848203610140860152620009c682826200087c565b9150508091505092915050565b5f6020820190508181035f830152620009ed8184620008bc565b905092915050565b62000a00816200074a565b811462000a0b575f80fd5b50565b5f8151905062000a1e81620009f5565b92915050565b5f6020828403121562000a3c5762000a3b620001c6565b5b5f62000a4b8482850162000a0e565b91505092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f62000a8d8262000340565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff820362000ac25762000ac162000a54565b5b60018201905091905056fe'