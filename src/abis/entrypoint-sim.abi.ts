export const I_ENTRY_POINT_SIMULATIONS = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  { type: 'receive', stateMutability: 'payable' },
  {
    type: 'function',
    name: 'addStake',
    inputs: [
      {
        name: 'unstakeDelaySec',
        type: 'uint32',
        internalType: 'uint32',
      },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'delegateAndRevert',
    inputs: [
      { name: 'target', type: 'address', internalType: 'address' },
      { name: 'data', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'depositTo',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'eip712Domain',
    inputs: [],
    outputs: [
      { name: 'fields', type: 'bytes1', internalType: 'bytes1' },
      { name: 'name', type: 'string', internalType: 'string' },
      { name: 'version', type: 'string', internalType: 'string' },
      { name: 'chainId', type: 'uint256', internalType: 'uint256' },
      {
        name: 'verifyingContract',
        type: 'address',
        internalType: 'address',
      },
      { name: 'salt', type: 'bytes32', internalType: 'bytes32' },
      {
        name: 'extensions',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDepositInfo',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [
      {
        name: 'info',
        type: 'tuple',
        internalType: 'struct IStakeManager.DepositInfo',
        components: [
          { name: 'deposit', type: 'uint256', internalType: 'uint256' },
          { name: 'staked', type: 'bool', internalType: 'bool' },
          { name: 'stake', type: 'uint112', internalType: 'uint112' },
          {
            name: 'unstakeDelaySec',
            type: 'uint32',
            internalType: 'uint32',
          },
          {
            name: 'withdrawTime',
            type: 'uint48',
            internalType: 'uint48',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDomainSeparatorV4',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getNonce',
    inputs: [
      { name: 'sender', type: 'address', internalType: 'address' },
      { name: 'key', type: 'uint192', internalType: 'uint192' },
    ],
    outputs: [{ name: 'nonce', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPackedUserOpTypeHash',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'getSenderAddress',
    inputs: [{ name: 'initCode', type: 'bytes', internalType: 'bytes' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getUserOpHash',
    inputs: [
      {
        name: 'userOp',
        type: 'tuple',
        internalType: 'struct PackedUserOperation',
        components: [
          { name: 'sender', type: 'address', internalType: 'address' },
          { name: 'nonce', type: 'uint256', internalType: 'uint256' },
          { name: 'initCode', type: 'bytes', internalType: 'bytes' },
          { name: 'callData', type: 'bytes', internalType: 'bytes' },
          {
            name: 'accountGasLimits',
            type: 'bytes32',
            internalType: 'bytes32',
          },
          {
            name: 'preVerificationGas',
            type: 'uint256',
            internalType: 'uint256',
          },
          { name: 'gasFees', type: 'bytes32', internalType: 'bytes32' },
          {
            name: 'paymasterAndData',
            type: 'bytes',
            internalType: 'bytes',
          },
          { name: 'signature', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'handleAggregatedOps',
    inputs: [
      {
        name: 'opsPerAggregator',
        type: 'tuple[]',
        internalType: 'struct IEntryPoint.UserOpsPerAggregator[]',
        components: [
          {
            name: 'userOps',
            type: 'tuple[]',
            internalType: 'struct PackedUserOperation[]',
            components: [
              {
                name: 'sender',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'nonce',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'initCode',
                type: 'bytes',
                internalType: 'bytes',
              },
              {
                name: 'callData',
                type: 'bytes',
                internalType: 'bytes',
              },
              {
                name: 'accountGasLimits',
                type: 'bytes32',
                internalType: 'bytes32',
              },
              {
                name: 'preVerificationGas',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'gasFees',
                type: 'bytes32',
                internalType: 'bytes32',
              },
              {
                name: 'paymasterAndData',
                type: 'bytes',
                internalType: 'bytes',
              },
              {
                name: 'signature',
                type: 'bytes',
                internalType: 'bytes',
              },
            ],
          },
          {
            name: 'aggregator',
            type: 'address',
            internalType: 'contract IAggregator',
          },
          { name: 'signature', type: 'bytes', internalType: 'bytes' },
        ],
      },
      {
        name: 'beneficiary',
        type: 'address',
        internalType: 'address payable',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'handleOps',
    inputs: [
      {
        name: 'ops',
        type: 'tuple[]',
        internalType: 'struct PackedUserOperation[]',
        components: [
          { name: 'sender', type: 'address', internalType: 'address' },
          { name: 'nonce', type: 'uint256', internalType: 'uint256' },
          { name: 'initCode', type: 'bytes', internalType: 'bytes' },
          { name: 'callData', type: 'bytes', internalType: 'bytes' },
          {
            name: 'accountGasLimits',
            type: 'bytes32',
            internalType: 'bytes32',
          },
          {
            name: 'preVerificationGas',
            type: 'uint256',
            internalType: 'uint256',
          },
          { name: 'gasFees', type: 'bytes32', internalType: 'bytes32' },
          {
            name: 'paymasterAndData',
            type: 'bytes',
            internalType: 'bytes',
          },
          { name: 'signature', type: 'bytes', internalType: 'bytes' },
        ],
      },
      {
        name: 'beneficiary',
        type: 'address',
        internalType: 'address payable',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'incrementNonce',
    inputs: [{ name: 'key', type: 'uint192', internalType: 'uint192' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'innerHandleOp',
    inputs: [
      { name: 'callData', type: 'bytes', internalType: 'bytes' },
      {
        name: 'opInfo',
        type: 'tuple',
        internalType: 'struct EntryPoint.UserOpInfo',
        components: [
          {
            name: 'mUserOp',
            type: 'tuple',
            internalType: 'struct EntryPoint.MemoryUserOp',
            components: [
              {
                name: 'sender',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'nonce',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'verificationGasLimit',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'callGasLimit',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'paymasterVerificationGasLimit',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'paymasterPostOpGasLimit',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'preVerificationGas',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'paymaster',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'maxFeePerGas',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'maxPriorityFeePerGas',
                type: 'uint256',
                internalType: 'uint256',
              },
            ],
          },
          {
            name: 'userOpHash',
            type: 'bytes32',
            internalType: 'bytes32',
          },
          { name: 'prefund', type: 'uint256', internalType: 'uint256' },
          {
            name: 'contextOffset',
            type: 'uint256',
            internalType: 'uint256',
          },
          { name: 'preOpGas', type: 'uint256', internalType: 'uint256' },
        ],
      },
      { name: 'context', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [
      {
        name: 'actualGasCost',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'nonceSequenceNumber',
    inputs: [
      { name: '', type: 'address', internalType: 'address' },
      { name: '', type: 'uint192', internalType: 'uint192' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'senderCreator',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract ISenderCreator',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'simulateHandleOp',
    inputs: [
      {
        name: 'op',
        type: 'tuple',
        internalType: 'struct PackedUserOperation',
        components: [
          { name: 'sender', type: 'address', internalType: 'address' },
          { name: 'nonce', type: 'uint256', internalType: 'uint256' },
          { name: 'initCode', type: 'bytes', internalType: 'bytes' },
          { name: 'callData', type: 'bytes', internalType: 'bytes' },
          {
            name: 'accountGasLimits',
            type: 'bytes32',
            internalType: 'bytes32',
          },
          {
            name: 'preVerificationGas',
            type: 'uint256',
            internalType: 'uint256',
          },
          { name: 'gasFees', type: 'bytes32', internalType: 'bytes32' },
          {
            name: 'paymasterAndData',
            type: 'bytes',
            internalType: 'bytes',
          },
          { name: 'signature', type: 'bytes', internalType: 'bytes' },
        ],
      },
      { name: 'target', type: 'address', internalType: 'address' },
      { name: 'targetCallData', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct IEntryPointSimulations.ExecutionResult',
        components: [
          {
            name: 'preOpGas',
            type: 'uint256',
            internalType: 'uint256',
          },
          { name: 'paid', type: 'uint256', internalType: 'uint256' },
          {
            name: 'accountValidationData',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'paymasterValidationData',
            type: 'uint256',
            internalType: 'uint256',
          },
          { name: 'targetSuccess', type: 'bool', internalType: 'bool' },
          { name: 'targetResult', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'simulateValidation',
    inputs: [
      {
        name: 'userOp',
        type: 'tuple',
        internalType: 'struct PackedUserOperation',
        components: [
          { name: 'sender', type: 'address', internalType: 'address' },
          { name: 'nonce', type: 'uint256', internalType: 'uint256' },
          { name: 'initCode', type: 'bytes', internalType: 'bytes' },
          { name: 'callData', type: 'bytes', internalType: 'bytes' },
          {
            name: 'accountGasLimits',
            type: 'bytes32',
            internalType: 'bytes32',
          },
          {
            name: 'preVerificationGas',
            type: 'uint256',
            internalType: 'uint256',
          },
          { name: 'gasFees', type: 'bytes32', internalType: 'bytes32' },
          {
            name: 'paymasterAndData',
            type: 'bytes',
            internalType: 'bytes',
          },
          { name: 'signature', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct IEntryPointSimulations.ValidationResult',
        components: [
          {
            name: 'returnInfo',
            type: 'tuple',
            internalType: 'struct IEntryPoint.ReturnInfo',
            components: [
              {
                name: 'preOpGas',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'prefund',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'accountValidationData',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'paymasterValidationData',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'paymasterContext',
                type: 'bytes',
                internalType: 'bytes',
              },
            ],
          },
          {
            name: 'senderInfo',
            type: 'tuple',
            internalType: 'struct IStakeManager.StakeInfo',
            components: [
              {
                name: 'stake',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'unstakeDelaySec',
                type: 'uint256',
                internalType: 'uint256',
              },
            ],
          },
          {
            name: 'factoryInfo',
            type: 'tuple',
            internalType: 'struct IStakeManager.StakeInfo',
            components: [
              {
                name: 'stake',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'unstakeDelaySec',
                type: 'uint256',
                internalType: 'uint256',
              },
            ],
          },
          {
            name: 'paymasterInfo',
            type: 'tuple',
            internalType: 'struct IStakeManager.StakeInfo',
            components: [
              {
                name: 'stake',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'unstakeDelaySec',
                type: 'uint256',
                internalType: 'uint256',
              },
            ],
          },
          {
            name: 'aggregatorInfo',
            type: 'tuple',
            internalType: 'struct IEntryPointSimulations.AggregatorStakeInfo',
            components: [
              {
                name: 'aggregator',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'stakeInfo',
                type: 'tuple',
                internalType: 'struct IStakeManager.StakeInfo',
                components: [
                  {
                    name: 'stake',
                    type: 'uint256',
                    internalType: 'uint256',
                  },
                  {
                    name: 'unstakeDelaySec',
                    type: 'uint256',
                    internalType: 'uint256',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'supportsInterface',
    inputs: [{ name: '', type: 'bytes4', internalType: 'bytes4' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'unlockStake',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'validateSenderAndPaymaster',
    inputs: [
      { name: 'initCode', type: 'bytes', internalType: 'bytes' },
      { name: 'sender', type: 'address', internalType: 'address' },
      { name: 'paymasterAndData', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'withdrawStake',
    inputs: [
      {
        name: 'withdrawAddress',
        type: 'address',
        internalType: 'address payable',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdrawTo',
    inputs: [
      {
        name: 'withdrawAddress',
        type: 'address',
        internalType: 'address payable',
      },
      {
        name: 'withdrawAmount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'AccountDeployed',
    inputs: [
      {
        name: 'userOpHash',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'factory',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'paymaster',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'BeforeExecution',
    inputs: [],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      {
        name: 'account',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'totalDeposit',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'EIP712DomainChanged',
    inputs: [],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PostOpRevertReason',
    inputs: [
      {
        name: 'userOpHash',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'nonce',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'revertReason',
        type: 'bytes',
        indexed: false,
        internalType: 'bytes',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SignatureAggregatorChanged',
    inputs: [
      {
        name: 'aggregator',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'StakeLocked',
    inputs: [
      {
        name: 'account',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'totalStaked',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'unstakeDelaySec',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'StakeUnlocked',
    inputs: [
      {
        name: 'account',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'withdrawTime',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'StakeWithdrawn',
    inputs: [
      {
        name: 'account',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'withdrawAddress',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'UserOperationEvent',
    inputs: [
      {
        name: 'userOpHash',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'paymaster',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'nonce',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'success',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
      {
        name: 'actualGasCost',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'actualGasUsed',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'UserOperationPrefundTooLow',
    inputs: [
      {
        name: 'userOpHash',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'nonce',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'UserOperationRevertReason',
    inputs: [
      {
        name: 'userOpHash',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'nonce',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'revertReason',
        type: 'bytes',
        indexed: false,
        internalType: 'bytes',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Withdrawn',
    inputs: [
      {
        name: 'account',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'withdrawAddress',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'DelegateAndRevert',
    inputs: [
      { name: 'success', type: 'bool', internalType: 'bool' },
      { name: 'ret', type: 'bytes', internalType: 'bytes' },
    ],
  },
  {
    type: 'error',
    name: 'FailedOp',
    inputs: [
      { name: 'opIndex', type: 'uint256', internalType: 'uint256' },
      { name: 'reason', type: 'string', internalType: 'string' },
    ],
  },
  {
    type: 'error',
    name: 'FailedOpWithRevert',
    inputs: [
      { name: 'opIndex', type: 'uint256', internalType: 'uint256' },
      { name: 'reason', type: 'string', internalType: 'string' },
      { name: 'inner', type: 'bytes', internalType: 'bytes' },
    ],
  },
  { type: 'error', name: 'InvalidShortString', inputs: [] },
  {
    type: 'error',
    name: 'PostOpReverted',
    inputs: [{ name: 'returnData', type: 'bytes', internalType: 'bytes' }],
  },
  { type: 'error', name: 'ReentrancyGuardReentrantCall', inputs: [] },
  {
    type: 'error',
    name: 'SenderAddressResult',
    inputs: [{ name: 'sender', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'SignatureValidationFailed',
    inputs: [{ name: 'aggregator', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'StringTooLong',
    inputs: [{ name: 'str', type: 'string', internalType: 'string' }],
  },
]

export const ENTRY_POINT_SIMULATIONS = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  { type: 'receive', stateMutability: 'payable' },
  {
    type: 'function',
    name: 'addStake',
    inputs: [
      {
        name: 'unstakeDelaySec',
        type: 'uint32',
        internalType: 'uint32',
      },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'delegateAndRevert',
    inputs: [
      { name: 'target', type: 'address', internalType: 'address' },
      { name: 'data', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'depositTo',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'eip712Domain',
    inputs: [],
    outputs: [
      { name: 'fields', type: 'bytes1', internalType: 'bytes1' },
      { name: 'name', type: 'string', internalType: 'string' },
      { name: 'version', type: 'string', internalType: 'string' },
      { name: 'chainId', type: 'uint256', internalType: 'uint256' },
      {
        name: 'verifyingContract',
        type: 'address',
        internalType: 'address',
      },
      { name: 'salt', type: 'bytes32', internalType: 'bytes32' },
      {
        name: 'extensions',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDepositInfo',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [
      {
        name: 'info',
        type: 'tuple',
        internalType: 'struct IStakeManager.DepositInfo',
        components: [
          { name: 'deposit', type: 'uint256', internalType: 'uint256' },
          { name: 'staked', type: 'bool', internalType: 'bool' },
          { name: 'stake', type: 'uint112', internalType: 'uint112' },
          {
            name: 'unstakeDelaySec',
            type: 'uint32',
            internalType: 'uint32',
          },
          {
            name: 'withdrawTime',
            type: 'uint48',
            internalType: 'uint48',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDomainSeparatorV4',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getNonce',
    inputs: [
      { name: 'sender', type: 'address', internalType: 'address' },
      { name: 'key', type: 'uint192', internalType: 'uint192' },
    ],
    outputs: [{ name: 'nonce', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPackedUserOpTypeHash',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'getSenderAddress',
    inputs: [{ name: 'initCode', type: 'bytes', internalType: 'bytes' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getUserOpHash',
    inputs: [
      {
        name: 'userOp',
        type: 'tuple',
        internalType: 'struct PackedUserOperation',
        components: [
          { name: 'sender', type: 'address', internalType: 'address' },
          { name: 'nonce', type: 'uint256', internalType: 'uint256' },
          { name: 'initCode', type: 'bytes', internalType: 'bytes' },
          { name: 'callData', type: 'bytes', internalType: 'bytes' },
          {
            name: 'accountGasLimits',
            type: 'bytes32',
            internalType: 'bytes32',
          },
          {
            name: 'preVerificationGas',
            type: 'uint256',
            internalType: 'uint256',
          },
          { name: 'gasFees', type: 'bytes32', internalType: 'bytes32' },
          {
            name: 'paymasterAndData',
            type: 'bytes',
            internalType: 'bytes',
          },
          { name: 'signature', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'handleAggregatedOps',
    inputs: [
      {
        name: 'opsPerAggregator',
        type: 'tuple[]',
        internalType: 'struct IEntryPoint.UserOpsPerAggregator[]',
        components: [
          {
            name: 'userOps',
            type: 'tuple[]',
            internalType: 'struct PackedUserOperation[]',
            components: [
              {
                name: 'sender',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'nonce',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'initCode',
                type: 'bytes',
                internalType: 'bytes',
              },
              {
                name: 'callData',
                type: 'bytes',
                internalType: 'bytes',
              },
              {
                name: 'accountGasLimits',
                type: 'bytes32',
                internalType: 'bytes32',
              },
              {
                name: 'preVerificationGas',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'gasFees',
                type: 'bytes32',
                internalType: 'bytes32',
              },
              {
                name: 'paymasterAndData',
                type: 'bytes',
                internalType: 'bytes',
              },
              {
                name: 'signature',
                type: 'bytes',
                internalType: 'bytes',
              },
            ],
          },
          {
            name: 'aggregator',
            type: 'address',
            internalType: 'contract IAggregator',
          },
          { name: 'signature', type: 'bytes', internalType: 'bytes' },
        ],
      },
      {
        name: 'beneficiary',
        type: 'address',
        internalType: 'address payable',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'handleOps',
    inputs: [
      {
        name: 'ops',
        type: 'tuple[]',
        internalType: 'struct PackedUserOperation[]',
        components: [
          { name: 'sender', type: 'address', internalType: 'address' },
          { name: 'nonce', type: 'uint256', internalType: 'uint256' },
          { name: 'initCode', type: 'bytes', internalType: 'bytes' },
          { name: 'callData', type: 'bytes', internalType: 'bytes' },
          {
            name: 'accountGasLimits',
            type: 'bytes32',
            internalType: 'bytes32',
          },
          {
            name: 'preVerificationGas',
            type: 'uint256',
            internalType: 'uint256',
          },
          { name: 'gasFees', type: 'bytes32', internalType: 'bytes32' },
          {
            name: 'paymasterAndData',
            type: 'bytes',
            internalType: 'bytes',
          },
          { name: 'signature', type: 'bytes', internalType: 'bytes' },
        ],
      },
      {
        name: 'beneficiary',
        type: 'address',
        internalType: 'address payable',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'incrementNonce',
    inputs: [{ name: 'key', type: 'uint192', internalType: 'uint192' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'innerHandleOp',
    inputs: [
      { name: 'callData', type: 'bytes', internalType: 'bytes' },
      {
        name: 'opInfo',
        type: 'tuple',
        internalType: 'struct EntryPoint.UserOpInfo',
        components: [
          {
            name: 'mUserOp',
            type: 'tuple',
            internalType: 'struct EntryPoint.MemoryUserOp',
            components: [
              {
                name: 'sender',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'nonce',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'verificationGasLimit',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'callGasLimit',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'paymasterVerificationGasLimit',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'paymasterPostOpGasLimit',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'preVerificationGas',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'paymaster',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'maxFeePerGas',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'maxPriorityFeePerGas',
                type: 'uint256',
                internalType: 'uint256',
              },
            ],
          },
          {
            name: 'userOpHash',
            type: 'bytes32',
            internalType: 'bytes32',
          },
          { name: 'prefund', type: 'uint256', internalType: 'uint256' },
          {
            name: 'contextOffset',
            type: 'uint256',
            internalType: 'uint256',
          },
          { name: 'preOpGas', type: 'uint256', internalType: 'uint256' },
        ],
      },
      { name: 'context', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [
      {
        name: 'actualGasCost',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'nonceSequenceNumber',
    inputs: [
      { name: '', type: 'address', internalType: 'address' },
      { name: '', type: 'uint192', internalType: 'uint192' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'senderCreator',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract ISenderCreator',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'simulateHandleOp',
    inputs: [
      {
        name: 'op',
        type: 'tuple',
        internalType: 'struct PackedUserOperation',
        components: [
          { name: 'sender', type: 'address', internalType: 'address' },
          { name: 'nonce', type: 'uint256', internalType: 'uint256' },
          { name: 'initCode', type: 'bytes', internalType: 'bytes' },
          { name: 'callData', type: 'bytes', internalType: 'bytes' },
          {
            name: 'accountGasLimits',
            type: 'bytes32',
            internalType: 'bytes32',
          },
          {
            name: 'preVerificationGas',
            type: 'uint256',
            internalType: 'uint256',
          },
          { name: 'gasFees', type: 'bytes32', internalType: 'bytes32' },
          {
            name: 'paymasterAndData',
            type: 'bytes',
            internalType: 'bytes',
          },
          { name: 'signature', type: 'bytes', internalType: 'bytes' },
        ],
      },
      { name: 'target', type: 'address', internalType: 'address' },
      { name: 'targetCallData', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct IEntryPointSimulations.ExecutionResult',
        components: [
          {
            name: 'preOpGas',
            type: 'uint256',
            internalType: 'uint256',
          },
          { name: 'paid', type: 'uint256', internalType: 'uint256' },
          {
            name: 'accountValidationData',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'paymasterValidationData',
            type: 'uint256',
            internalType: 'uint256',
          },
          { name: 'targetSuccess', type: 'bool', internalType: 'bool' },
          { name: 'targetResult', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'simulateValidation',
    inputs: [
      {
        name: 'userOp',
        type: 'tuple',
        internalType: 'struct PackedUserOperation',
        components: [
          { name: 'sender', type: 'address', internalType: 'address' },
          { name: 'nonce', type: 'uint256', internalType: 'uint256' },
          { name: 'initCode', type: 'bytes', internalType: 'bytes' },
          { name: 'callData', type: 'bytes', internalType: 'bytes' },
          {
            name: 'accountGasLimits',
            type: 'bytes32',
            internalType: 'bytes32',
          },
          {
            name: 'preVerificationGas',
            type: 'uint256',
            internalType: 'uint256',
          },
          { name: 'gasFees', type: 'bytes32', internalType: 'bytes32' },
          {
            name: 'paymasterAndData',
            type: 'bytes',
            internalType: 'bytes',
          },
          { name: 'signature', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct IEntryPointSimulations.ValidationResult',
        components: [
          {
            name: 'returnInfo',
            type: 'tuple',
            internalType: 'struct IEntryPoint.ReturnInfo',
            components: [
              {
                name: 'preOpGas',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'prefund',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'accountValidationData',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'paymasterValidationData',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'paymasterContext',
                type: 'bytes',
                internalType: 'bytes',
              },
            ],
          },
          {
            name: 'senderInfo',
            type: 'tuple',
            internalType: 'struct IStakeManager.StakeInfo',
            components: [
              {
                name: 'stake',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'unstakeDelaySec',
                type: 'uint256',
                internalType: 'uint256',
              },
            ],
          },
          {
            name: 'factoryInfo',
            type: 'tuple',
            internalType: 'struct IStakeManager.StakeInfo',
            components: [
              {
                name: 'stake',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'unstakeDelaySec',
                type: 'uint256',
                internalType: 'uint256',
              },
            ],
          },
          {
            name: 'paymasterInfo',
            type: 'tuple',
            internalType: 'struct IStakeManager.StakeInfo',
            components: [
              {
                name: 'stake',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'unstakeDelaySec',
                type: 'uint256',
                internalType: 'uint256',
              },
            ],
          },
          {
            name: 'aggregatorInfo',
            type: 'tuple',
            internalType: 'struct IEntryPointSimulations.AggregatorStakeInfo',
            components: [
              {
                name: 'aggregator',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'stakeInfo',
                type: 'tuple',
                internalType: 'struct IStakeManager.StakeInfo',
                components: [
                  {
                    name: 'stake',
                    type: 'uint256',
                    internalType: 'uint256',
                  },
                  {
                    name: 'unstakeDelaySec',
                    type: 'uint256',
                    internalType: 'uint256',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'supportsInterface',
    inputs: [{ name: '', type: 'bytes4', internalType: 'bytes4' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'unlockStake',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'validateSenderAndPaymaster',
    inputs: [
      { name: 'initCode', type: 'bytes', internalType: 'bytes' },
      { name: 'sender', type: 'address', internalType: 'address' },
      { name: 'paymasterAndData', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'withdrawStake',
    inputs: [
      {
        name: 'withdrawAddress',
        type: 'address',
        internalType: 'address payable',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdrawTo',
    inputs: [
      {
        name: 'withdrawAddress',
        type: 'address',
        internalType: 'address payable',
      },
      {
        name: 'withdrawAmount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'AccountDeployed',
    inputs: [
      {
        name: 'userOpHash',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'factory',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'paymaster',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'BeforeExecution',
    inputs: [],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      {
        name: 'account',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'totalDeposit',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'EIP712DomainChanged',
    inputs: [],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PostOpRevertReason',
    inputs: [
      {
        name: 'userOpHash',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'nonce',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'revertReason',
        type: 'bytes',
        indexed: false,
        internalType: 'bytes',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SignatureAggregatorChanged',
    inputs: [
      {
        name: 'aggregator',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'StakeLocked',
    inputs: [
      {
        name: 'account',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'totalStaked',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'unstakeDelaySec',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'StakeUnlocked',
    inputs: [
      {
        name: 'account',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'withdrawTime',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'StakeWithdrawn',
    inputs: [
      {
        name: 'account',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'withdrawAddress',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'UserOperationEvent',
    inputs: [
      {
        name: 'userOpHash',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'paymaster',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'nonce',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'success',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
      {
        name: 'actualGasCost',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'actualGasUsed',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'UserOperationPrefundTooLow',
    inputs: [
      {
        name: 'userOpHash',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'nonce',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'UserOperationRevertReason',
    inputs: [
      {
        name: 'userOpHash',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'nonce',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'revertReason',
        type: 'bytes',
        indexed: false,
        internalType: 'bytes',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Withdrawn',
    inputs: [
      {
        name: 'account',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'withdrawAddress',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'DelegateAndRevert',
    inputs: [
      { name: 'success', type: 'bool', internalType: 'bool' },
      { name: 'ret', type: 'bytes', internalType: 'bytes' },
    ],
  },
  {
    type: 'error',
    name: 'FailedOp',
    inputs: [
      { name: 'opIndex', type: 'uint256', internalType: 'uint256' },
      { name: 'reason', type: 'string', internalType: 'string' },
    ],
  },
  {
    type: 'error',
    name: 'FailedOpWithRevert',
    inputs: [
      { name: 'opIndex', type: 'uint256', internalType: 'uint256' },
      { name: 'reason', type: 'string', internalType: 'string' },
      { name: 'inner', type: 'bytes', internalType: 'bytes' },
    ],
  },
  { type: 'error', name: 'InvalidShortString', inputs: [] },
  {
    type: 'error',
    name: 'PostOpReverted',
    inputs: [{ name: 'returnData', type: 'bytes', internalType: 'bytes' }],
  },
  { type: 'error', name: 'ReentrancyGuardReentrantCall', inputs: [] },
  {
    type: 'error',
    name: 'SenderAddressResult',
    inputs: [{ name: 'sender', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'SignatureValidationFailed',
    inputs: [{ name: 'aggregator', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'StringTooLong',
    inputs: [{ name: 'str', type: 'string', internalType: 'string' }],
  },
]

export const EntryPointSimulationsDeployedBytecode =
  '0x608060405260043610610185575f3560e01c80635287ce12116100d15780639b249f691161007c578063c23a5cea11610057578063c23a5cea1461056a578063c3bce00914610589578063dbed18e0146105b5575f5ffd5b80639b249f6914610524578063b760faf914610543578063bb9fe6bf14610556575f5ffd5b806384b0196e116100ac57806384b0196e146104b2578063850aaf62146104d957806397b2dcb9146104f8575f5ffd5b80635287ce121461034b57806370a082311461045f578063765e827f14610493575f5ffd5b8063154e58dc11610131578063205c28781161010c578063205c2878146102ee57806322cdde4c1461030d57806335567e1a1461032c575f5ffd5b8063154e58dc146102675780631b2e01b8146102995780631f5ae7bb146102cf575f5ffd5b806309ccb8801161016157806309ccb8801461020d5780630bd28e3b1461023457806313c65a6e14610253575f5ffd5b806242dc531461019957806301ffc9a7146101cb5780630396cb60146101fa575f5ffd5b3661019557610193336105d4565b005b5f5ffd5b3480156101a4575f5ffd5b506101b86101b3366004613cd5565b6105f5565b6040519081526020015b60405180910390f35b3480156101d6575f5ffd5b506101ea6101e5366004613dad565b505f90565b60405190151581526020016101c2565b610193610208366004613dec565b61078b565b348015610218575f5ffd5b506004546040516001600160a01b0390911681526020016101c2565b34801561023f575f5ffd5b5061019361024e366004613e36565b610a58565b34801561025e575f5ffd5b506005546101b8565b348015610272575f5ffd5b507f29a0bca4af4be3421398da00295e58e6d7de38cb492214754cb6a47507dd6f8e6101b8565b3480156102a4575f5ffd5b506101b86102b3366004613e4f565b600160209081525f928352604080842090915290825290205481565b3480156102da575f5ffd5b506101936102e9366004613e82565b610a9f565b3480156102f9575f5ffd5b50610193610308366004613f04565b610b69565b348015610318575f5ffd5b506101b8610327366004613f45565b610cbf565b348015610337575f5ffd5b506101b8610346366004613e4f565b610d23565b348015610356575f5ffd5b50610405610365366004613f77565b6040805160a0810182525f80825260208201819052918101829052606081018290526080810191909152506001600160a01b03165f9081526020818152604091829020825160a0810184528154815260019091015460ff811615159282019290925261010082046001600160701b031692810192909252600160781b810463ffffffff166060830152600160981b900465ffffffffffff16608082015290565b6040516101c291905f60a082019050825182526020830151151560208301526001600160701b03604084015116604083015263ffffffff606084015116606083015265ffffffffffff608084015116608083015292915050565b34801561046a575f5ffd5b506101b8610479366004613f77565b6001600160a01b03165f9081526020819052604090205490565b34801561049e575f5ffd5b506101936104ad366004613fd3565b610d79565b3480156104bd575f5ffd5b506104c6610e88565b6040516101c29796959493929190614054565b3480156104e4575f5ffd5b506101936104f3366004614106565b610ee6565b348015610503575f5ffd5b50610517610512366004614157565b610f7a565b6040516101c291906141b8565b34801561052f575f5ffd5b5061019361053e366004614206565b61109c565b610193610551366004613f77565b6105d4565b348015610561575f5ffd5b5061019361115c565b348015610575575f5ffd5b50610193610584366004613f77565b6112c0565b348015610594575f5ffd5b506105a86105a3366004613f45565b611505565b6040516101c29190614245565b3480156105c0575f5ffd5b506101936105cf366004613fd3565b61175b565b60015b60058110156105e8576001016105d7565b6105f182611a9c565b5050565b5f5f5a905033301461064e5760405162461bcd60e51b815260206004820152601760248201527f4141393220696e7465726e616c2063616c6c206f6e6c7900000000000000000060448201526064015b60405180910390fd5b8451606081015160a082015181016127100160405a603f028161067357610673614318565b0410156106895763deaddead60e01b5f5260205ffd5b87515f901561072d575f6106a2845f01515f8c86611aed565b90508061072b575f6106b360405190565b90505f6106c1610800611b03565b80519091501561071b57855f01516001600160a01b03168b602001517f1c4fada7374c0a9ee8841fc38afe82932dc0f8e69012e927f061a8bae611a20188602001518460405161071292919061432c565b60405180910390a35b61072482604052565b6001935050505b505b5f88608001515a860301905061077b828a8a8a8080601f0160208091040260200160405190810160405280939291908181526020018383808284375f92019190915250879250611b34915050565b955050505050505b949350505050565b335f90815260208190526040902063ffffffff82166107ec5760405162461bcd60e51b815260206004820152601a60248201527f6d757374207370656369667920756e7374616b652064656c61790000000000006044820152606401610645565b600181015463ffffffff600160781b909104811690831610156108515760405162461bcd60e51b815260206004820152601c60248201527f63616e6e6f7420646563726561736520756e7374616b652074696d65000000006044820152606401610645565b60018101545f9061087190349061010090046001600160701b0316614358565b90505f81116108c25760405162461bcd60e51b815260206004820152601260248201527f6e6f207374616b652073706563696669656400000000000000000000000000006044820152606401610645565b6001600160701b038111156109195760405162461bcd60e51b815260206004820152600e60248201527f7374616b65206f766572666c6f770000000000000000000000000000000000006044820152606401610645565b6040805160a08101825283548152600160208083018281526001600160701b0386811685870190815263ffffffff8a8116606088018181525f60808a0181815233808352828a52918c90209a518b55965199909801805494519151965165ffffffffffff16600160981b027fffffffffffffff000000000000ffffffffffffffffffffffffffffffffffffff97909416600160781b02969096167fffffffffffffff00000000000000000000ffffffffffffffffffffffffffffff91909516610100026effffffffffffffffffffffffffff0019991515999099166effffffffffffffffffffffffffffff1990941693909317979097179190911691909117179055835185815290810192909252917fa5ae833d0bb1dcd632d98a8b70973e8516812898e19bf27b70071ebc8dc52c01910160405180910390a2505050565b335f90815260016020908152604080832077ffffffffffffffffffffffffffffffffffffffffffffffff851684529091528120805491610a978361436b565b919050555050565b83158015610ab557506001600160a01b0383163b155b15610ad25760405162461bcd60e51b815260040161064590614383565b60148110610b48575f610ae860148284866143bf565b610af1916143e6565b60601c9050803b5f03610b465760405162461bcd60e51b815260206004820152601b60248201527f41413330207061796d6173746572206e6f74206465706c6f79656400000000006044820152606401610645565b505b60405162461bcd60e51b8152602060048201525f6024820152604401610645565b335f908152602081905260409020805480831115610bc95760405162461bcd60e51b815260206004820152601960248201527f576974686472617720616d6f756e7420746f6f206c61726765000000000000006044820152606401610645565b610bd38382614433565b8255604080516001600160a01b03861681526020810185905233917fd1c19fbcd4551a5edfb66d43d2e337c04837afda3482b42bdf569a8fccdae5fb910160405180910390a25f846001600160a01b0316846040515f6040518083038185875af1925050503d805f8114610c62576040519150601f19603f3d011682016040523d82523d5f602084013e610c67565b606091505b5050905080610cb85760405162461bcd60e51b815260206004820152601260248201527f6661696c656420746f20776974686472617700000000000000000000000000006044820152606401610645565b5050505050565b5f5f610cca83611d2e565b9050610d1c610cd860055490565b610ce28584611dd9565b6040517f19010000000000000000000000000000000000000000000000000000000000008152600281019290925260228201526042902090565b9392505050565b6001600160a01b0382165f90815260016020908152604080832077ffffffffffffffffffffffffffffffffffffffffffffffff8516845290915290819020549082901b67ffffffffffffffff1916175b92915050565b610d81611df3565b815f8167ffffffffffffffff811115610d9c57610d9c613b13565b604051908082528060200260200182016040528015610dd557816020015b610dc26139ac565b815260200190600190039081610dba5790505b509050610de58585835f5f611e7b565b506040515f907fbb47ee3e183a558b1a2ff0874b079f3fc5478b7454eacf2bfc5af2ff5878f972908290a15f5b83811015610e6d57610e6181888884818110610e3057610e30614446565b9050602002810190610e42919061445a565b858481518110610e5457610e54614446565b6020026020010151611efe565b90910190600101610e12565b50610e788482612224565b505050610e83612319565b505050565b5f6060805f5f5f6060610e99612343565b610ea1612375565b604080515f808252602082019092527f0f000000000000000000000000000000000000000000000000000000000000009b939a50919850469750309650945092509050565b5f5f846001600160a01b03168484604051610f02929190614479565b5f60405180830381855af49150503d805f8114610f3a576040519150601f19603f3d011682016040523d82523d5f602084013e610f3f565b606091505b509150915081816040517f99410554000000000000000000000000000000000000000000000000000000008152600401610645929190614488565b610fb06040518060c001604052805f81526020015f81526020015f81526020015f81526020015f15158152602001606081525090565b610fb8611df3565b610fc06139ac565b610fc9866123a2565b5f5f610fd65f898561247a565b915091505f610fe65f8a86611efe565b90505f60606001600160a01b038a161561105957896001600160a01b03168989604051611014929190614479565b5f604051808303815f865af19150503d805f811461104d576040519150601f19603f3d011682016040523d82523d5f602084013e611052565b606091505b5090925090505b6040518060c00160405280876080015181526020018481526020018681526020018581526020018315158152602001828152509650505050505050610783612319565b5f6110af6004546001600160a01b031690565b6001600160a01b031663570e1a3684846040518363ffffffff1660e01b81526004016110dc9291906144ca565b6020604051808303815f875af11580156110f8573d5f5f3e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061111c91906144dd565b6040517f6ca7b8060000000000000000000000000000000000000000000000000000000081526001600160a01b0382166004820152909150602401610645565b335f90815260208190526040812060018101549091600160781b90910463ffffffff1690036111cd5760405162461bcd60e51b815260206004820152600a60248201527f6e6f74207374616b6564000000000000000000000000000000000000000000006044820152606401610645565b600181015460ff166112215760405162461bcd60e51b815260206004820152601160248201527f616c726561647920756e7374616b696e670000000000000000000000000000006044820152606401610645565b60018101545f9061123f90600160781b900463ffffffff16426144f8565b6001830180547fffffffffffffff000000000000ffffffffffffffffffffffffffffffffffff0016600160981b65ffffffffffff841690810260ff19169190911790915560405190815290915033907ffa9b3c14cc825c412c9ed81b3ba365a5b459439403f18829e572ed53a4180f0a906020015b60405180910390a25050565b335f908152602081905260409020600181015461010090046001600160701b03168061132e5760405162461bcd60e51b815260206004820152601460248201527f4e6f207374616b6520746f2077697468647261770000000000000000000000006044820152606401610645565b6001820154600160981b900465ffffffffffff1661138e5760405162461bcd60e51b815260206004820152601d60248201527f6d7573742063616c6c20756e6c6f636b5374616b6528292066697273740000006044820152606401610645565b600182015442600160981b90910465ffffffffffff1611156113f25760405162461bcd60e51b815260206004820152601b60248201527f5374616b65207769746864726177616c206973206e6f742064756500000000006044820152606401610645565b6001820180547fffffffffffffff000000000000000000000000000000000000000000000000ff169055604080516001600160a01b03851681526020810183905233917fb7c918e0e249f999e965cafeb6c664271b3f4317d296461500e71da39f0cbda3910160405180910390a25f836001600160a01b0316826040515f6040518083038185875af1925050503d805f81146114a9576040519150601f19603f3d011682016040523d82523d5f602084013e6114ae565b606091505b50509050806114ff5760405162461bcd60e51b815260206004820152601860248201527f6661696c656420746f207769746864726177207374616b6500000000000000006044820152606401610645565b50505050565b61150d613a33565b6115156139ac565b61151e836123a2565b5f5f61152b5f868561247a565b845160e001516040805180820182525f80825260208083018281526001600160a01b0395861683528282528483206001908101546001600160701b036101008083048216885263ffffffff600160781b9384900481169095528e51518951808b018b5288815280880189815291909b168852878752898820909401549081049091168952049091169052835180850190945281845283015293955091935090365f6115d960408b018b614516565b90925090505f60148210156115ee575f611608565b6115fb60145f84866143bf565b611604916143e6565b60601c5b6040805180820182525f80825260208083018281526001600160a01b0386168352908290529290206001015461010081046001600160701b03168252600160781b900463ffffffff1690915290915093505050505f8590505f6040518060a0016040528089608001518152602001896040015181526020018881526020018781526020016116978a6060015190565b905290506116a3613ade565b6001600160a01b038316158015906116c557506001836001600160a01b031614155b15611728576040805180820182526001600160a01b038516808252825180840184525f80825260208083018281529382528181529490206001015461010081046001600160701b03168252600160781b900463ffffffff16909152909182015290505b6040805160a081018252928352602083019590955293810192909252506060810192909252608082015295945050505050565b611763611df3565b815f805b8281101561189e573686868381811061178257611782614446565b90506020028101906117949190614559565b9050365f6117a2838061456d565b90925090505f6117b86040850160208601613f77565b9050806001600160a01b0381166001036117f15760405163086a9f7560e41b81526001600160a01b039091166004820152602401610645565b506001600160a01b0381161561188e576001600160a01b038116632dd81133848461181f6040890189614516565b6040518563ffffffff1660e01b815260040161183e94939291906146d4565b5f604051808303815f87803b158015611855575f5ffd5b505af1925050508015611866575060015b61188e5760405163086a9f7560e41b81526001600160a01b0382166004820152602401610645565b5093909301925050600101611767565b505f8167ffffffffffffffff8111156118b9576118b9613b13565b6040519080825280602002602001820160405280156118f257816020015b6118df6139ac565b8152602001906001900390816118d75790505b5090505f805b8481101561196c573688888381811061191357611913614446565b90506020028101906119259190614559565b9050365f611933838061456d565b90925090505f6119496040850160208601613f77565b9050611958838389848a611e7b565b909501945050600190920191506118f89050565b506040517fbb47ee3e183a558b1a2ff0874b079f3fc5478b7454eacf2bfc5af2ff5878f972905f90a1505f80805b85811015611a8457368989838181106119b5576119b5614446565b90506020028101906119c79190614559565b90506119d96040820160208301613f77565b6001600160a01b03167f575ff3acadd5ab348fe1855e217e0f3678f8d767d7494c9f9fefbee2e17cca4d60405160405180910390a2365f611a1a838061456d565b9092509050805f5b81811015611a7357611a6488858584818110611a4057611a40614446565b9050602002810190611a52919061445a565b8b8b81518110610e5457610e54614446565b60019889019897019601611a22565b50506001909301925061199a915050565b50611a8f8682612224565b5050505050610e83612319565b6001600160a01b0381165f8181526020818152604091829020805434019081905591518281529192917f2da466a7b24304f47e87fa2e1e5a81b9831ce54fec19055ce277ca2f39ba42c491016112b4565b5f5f5f845160208601878987f195945050505050565b60603d8215611b175782811115611b175750815b604051602082018101604052818152815f602083013e9392505050565b5f5f5a85519091505f9081611b488261269b565b90505f8260e0015190505f896080015188039050611b6a8185606001516126b6565b90970196505f6001600160a01b038216611b875783519450611c74565b8194505f89511115611c745782880296505f5a905060028c6002811115611bb057611bb061475f565b14611c5b57826001600160a01b0316637c627b218660a001518e8d8c896040518663ffffffff1660e01b8152600401611bec9493929190614773565b5f604051808303815f88803b158015611c03575f5ffd5b5087f193505050508015611c15575060015b611c5b575f611c25610800611b03565b9050806040517fad7954bc00000000000000000000000000000000000000000000000000000000815260040161064591906147ba565b5f5a82039050611c6f818760a001516126b6565b925050505b805a8703018801975082880296505f8a60400151905087811015611cd75760028c6002811115611ca657611ca661475f565b03611cc857809750611cb78b6126d6565b611cc38b5f8a8c612725565b611d1f565b63deadaa5160e01b5f5260205ffd5b6001600160a01b0386165f90815260208190526040812080548a840390810190915590808e6002811115611d0d57611d0d61475f565b149050611d1c8d828c8e612725565b50505b50505050505050949350505050565b5f3681611d3e6040850185614516565b91509150611d4c82826127a0565b611d5957505f9392505050565b5f611d6f611d6a6020870187613f77565b6127e9565b905060148211611db9576040516bffffffffffffffffffffffff19606083901b1660208201526034015b604051602081830303815290604052805190602001209350505050919050565b80611dc783601481876143bf565b604051602001611d99939291906147cc565b5f611de483836128f0565b80519060200120905092915050565b7f9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f005c15611e4c576040517f3ee5aeb500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b611e7960017f9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f005b906129e9565b565b835f5b81811015611ef4575f8582850181518110611e9b57611e9b614446565b602002602001015190505f5f611ed78487018b8b87818110611ebf57611ebf614446565b9050602002810190611ed1919061445a565b8561247a565b91509150611ee984870183838a6129f0565b505050600101611e7e565b5095945050505050565b5f5f5a90505f611f0f846060015190565b90505f5f611f1c60405190565b9050365f611f2d60608a018a614516565b9150915060605f826003811115611f4357843591505b507f72288ed1000000000000000000000000000000000000000000000000000000007fffffffff0000000000000000000000000000000000000000000000000000000082160161203a575f8b8b60200151604051602401611fa59291906147f7565b60408051601f198184030181529181526020820180516001600160e01b03167f8dd7712f000000000000000000000000000000000000000000000000000000001790525190915030906242dc53906120059084908f908d906024016148c2565b604051602081830303815290604052915060e01b6020820180516001600160e01b03838183161783525050505092505061208f565b306001600160a01b03166242dc5385858d8b60405160240161205f94939291906148f6565b604051602081830303815290604052915060e01b6020820180516001600160e01b03838183161783525050505091505b60205f8351602085015f305af195505f5198506120ab85604052565b50505050508061221a575f3d806020036120c95760205f5f3e5f5191505b5063deaddead60e01b810361212a5787604051631101335b60e11b8152600401610645918152604060208201819052600f908201527f41413935206f7574206f66206761730000000000000000000000000000000000606082015260800190565b63deadaa5160e01b8103612179575f86608001515a6121499087614433565b6121539190614358565b6040880151909150612164886126d6565b612170885f8385612725565b95506122189050565b5f61218360405190565b875180516020808b01519201519293506001600160a01b0316917ff62676f440ff169a3a9afdbf812e89e7f95975ee8e5c31214ffdef631c5f4792906121ca610800611b03565b6040516121d892919061432c565b60405180910390a36121e981604052565b5f87608001515a6121fa9088614433565b6122049190614358565b90506122136002898784611b34565b965050505b505b5050509392505050565b6001600160a01b03821661227a5760405162461bcd60e51b815260206004820152601860248201527f4141393020696e76616c69642062656e656669636961727900000000000000006044820152606401610645565b5f826001600160a01b0316826040515f6040518083038185875af1925050503d805f81146122c3576040519150601f19603f3d011682016040523d82523d5f602084013e6122c8565b606091505b5050905080610e835760405162461bcd60e51b815260206004820152601f60248201527f41413931206661696c65642073656e6420746f2062656e6566696369617279006044820152606401610645565b611e795f7f9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00611e73565b60606123707f00000000000000000000000000000000000000000000000000000000000000006002612bb8565b905090565b60606123707f00000000000000000000000000000000000000000000000000000000000000006003612bb8565b6123aa612c61565b30631f5ae7bb6123bd6040840184614516565b6123ca6020860186613f77565b6123d760e0870187614516565b6040518663ffffffff1660e01b81526004016123f795949392919061492b565b5f6040518083038186803b15801561240d575f5ffd5b505afa92505050801561241e575060015b6124775761242a61496c565b806308c379a00361246d575061243e614984565b80612449575061246f565b8051156105f1575f81604051631101335b60e11b815260040161064592919061432c565b505b3d5f5f3e3d5ffd5b50565b5f5f5f5a845190915061248d8682612e1f565b5f61249760405190565b90506124a287610cbf565b60208701526124b081604052565b604082015161012083015161010084015160a08501516080860151606087015160c088015186171717171717896effffffffffffffffffffffffffffff8211156125445760408051631101335b60e11b815260048101929092526024820152601860448201527f41413934206761732076616c756573206f766572666c6f7700000000000000006064820152608401610645565b505f6125738560c081015160a08201516080830151606084015160408501516101009095015194010101010290565b60408a0181905290506125888b8b8b84612f6a565b975061259b855f01518660200151613051565b8b906125f15760408051631101335b60e11b815260048101929092526024820152601a60448201527f4141323520696e76616c6964206163636f756e74206e6f6e63650000000000006064820152608401610645565b50825a8703111561264e578a604051631101335b60e11b8152600401610645918152604060208201819052601e908201527f41413236206f76657220766572696669636174696f6e4761734c696d69740000606082015260800190565b60e08501516060906001600160a01b0316156126745761266f8c8c8c61309e565b985090505b8060608b015260a08b01355a8803018a608001818152505050505050505050935093915050565b6101008101516101208201515f9190610783824883016131b8565b5f619c40830182116126c957505f610d73565b506064919003600a020490565b80518051602080840151928101516040519081526001600160a01b0390921692917f67b4fa9642f42120bf031f3051d1824b0fe25627945b27b8a6a65d5761d5482e910160405180910390a350565b835160e081015181516020808801519301516040516001600160a01b039384169492909316927f49628fd1471006c1482da88028e9ce4dbb080b815c9b0344d39e5a8e6ec1419f916127929189908990899093845291151560208401526040830152606082015260800190565b60405180910390a450505050565b5f60028210156127b157505f610d73565b50507f770200000000000000000000000000000000000000000000000000000000000090356bffffffffffffffffffffffff19161490565b5f5f60175f5f853c505f517fffffff000000000000000000000000000000000000000000000000000000000081167fef01000000000000000000000000000000000000000000000000000000000000146128de575f836001600160a01b03163b116128965760405162461bcd60e51b815260206004820152601260248201527f73656e64657220686173206e6f20636f646500000000000000000000000000006044820152606401610645565b60405162461bcd60e51b815260206004820152601860248201527f6e6f7420616e204549502d373730322064656c656761746500000000000000006044820152606401610645565b60481c6001600160a01b031692915050565b60605f6129006020850185613f77565b905060208401355f8481036129295761292461291f6040880188614516565b6131cd565b61292b565b845b90505f61293e61291f6060890189614516565b9050608087013560a088013560c08901355f61296061291f60e08d018d614516565b604080517f29a0bca4af4be3421398da00295e58e6d7de38cb492214754cb6a47507dd6f8e60208201526001600160a01b039a909a168a82015260608a019890985260808901969096525060a087019390935260c086019190915260e0850152610100840152610120808401919091528151808403909101815261014090920190529392505050565b80825d5050565b5f5f6129fb856131df565b91509150816001600160a01b0316836001600160a01b031614612a6a5785604051631101335b60e11b81526004016106459181526040602082018190526014908201527f41413234207369676e6174757265206572726f72000000000000000000000000606082015260800190565b8015612ac25785604051631101335b60e11b81526004016106459181526040602082018190526017908201527f414132322065787069726564206f72206e6f7420647565000000000000000000606082015260800190565b5f612acc856131df565b925090506001600160a01b03811615612b315786604051631101335b60e11b81526004016106459181526040602082018190526014908201527f41413334207369676e6174757265206572726f72000000000000000000000000606082015260800190565b8115612baf5786604051631101335b60e11b81526004016106459181526040602082018190526021908201527f41413332207061796d61737465722065787069726564206f72206e6f7420647560608201527f6500000000000000000000000000000000000000000000000000000000000000608082015260a00190565b50505050505050565b606060ff8314612bd257612bcb8361322f565b9050610d73565b818054612bde90614a00565b80601f0160208091040260200160405190810160405280929190818152602001828054612c0a90614a00565b8015612c555780601f10612c2c57610100808354040283529160200191612c55565b820191905f5260205f20905b815481529060010190602001808311612c3857829003601f168201915b50505050509050610d73565b6040517fd69400000000000000000000000000000000000000000000000000000000000060208201526bffffffffffffffffffffffff193060601b1660228201527f010000000000000000000000000000000000000000000000000000000000000060368201525f9060370160408051808303601f190181529190528051602090910120600480547fffffffffffffffffffffffff0000000000000000000000000000000000000000166001600160a01b0383161790559050612477604080518082018252600781527f455243343333370000000000000000000000000000000000000000000000000060209182015281518083018352600181527f31000000000000000000000000000000000000000000000000000000000000009082015281517f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f818301527f364da28a5c92bcc87fe97c8813a6c6b8a3a049b0ea0a328fcb0b4f0e00337586818401527fc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc660608201524660808201523060a0808301919091528351808303909101815260c09091019092528151910120600555565b612e2c6020830183613f77565b6001600160a01b0316815260208083013590820152612e4e608083013561326c565b6060830152604082015260a082013560c080830191909152612e729083013561326c565b610100830152610120820152365f612e8d60e0850185614516565b909250905080156114ff576034811015612ee95760405162461bcd60e51b815260206004820152601d60248201527f4141393320696e76616c6964207061796d6173746572416e64446174610000006044820152606401610645565b5f612ef48383613294565b60a0870152608086015290506001600160a01b038116612f565760405162461bcd60e51b815260206004820152601660248201527f4141393820696e76616c6964207061796d6173746572000000000000000000006044820152606401610645565b6001600160a01b031660e084015250505050565b815180515f9190612f888786612f8360408a018a614516565b613304565b60e08201515f6001600160a01b038216612fc9576001600160a01b0383165f90815260208190526040902054868111612fc357808703612fc5565b5f5b9150505b612fd58989898461369e565b94506001600160a01b03821661304557612fef83876137a2565b6130455788604051631101335b60e11b81526004016106459181526040602082018190526017908201527f41413231206469646e2774207061792070726566756e64000000000000000000606082015260800190565b50505050949350505050565b6001600160a01b0382165f90815260016020908152604080832084821c808552925282208054849167ffffffffffffffff83169190856130908361436b565b909155501495945050505050565b60605f5f5a845160e0810151604087015192935090916130be82826137a2565b6131145788604051631101335b60e11b8152600401610645918152604060208201819052601e908201527f41413331207061796d6173746572206465706f73697420746f6f206c6f770000606082015260800190565b60808301516131248a8a8a6137db565b9097509550805a860311156131ab5789604051631101335b60e11b81526004016106459181526040602082018190526027908201527f41413336206f766572207061796d6173746572566572696669636174696f6e4760608201527f61734c696d697400000000000000000000000000000000000000000000000000608082015260a00190565b5050505050935093915050565b5f8183106131c65781610d1c565b5090919050565b5f604051828085833790209392505050565b5f5f825f036131f257505f928392509050565b5f6131fc846138fd565b9050806040015165ffffffffffff164211806132245750806020015165ffffffffffff164211155b905194909350915050565b60605f61323b8361396c565b6040805160208082528183019092529192505f91906020820181803683375050509182525060208101929092525090565b5f5f6132788360801c90565b6fffffffffffffffffffffffffffffffff841691509150915091565b5f80806132a460148286886143bf565b6132ad916143e6565b60601c6132be6024601487896143bf565b6132c791614a32565b60801c6132d860346024888a6143bf565b6132e191614a32565b9194506fffffffffffffffffffffffffffffffff16925060801c90509250925092565b80156114ff5782515161331783836127a0565b156133a157601482111561339b576004548451604001516001600160a01b039091169063c09ad0d9908361334e866014818a6143bf565b6040518563ffffffff1660e01b815260040161336c93929190614a79565b5f604051808303815f88803b158015613383575f5ffd5b5087f1158015613395573d5f5f3e3d5ffd5b50505050505b506114ff565b6001600160a01b0381163b156134035784604051631101335b60e11b8152600401610645918152604060208201819052601f908201527f414131302073656e64657220616c726561647920636f6e737472756374656400606082015260800190565b601482101561345e5784604051631101335b60e11b81526004016106459181526040602082018190526017908201527f4141393920696e6974436f646520746f6f20736d616c6c000000000000000000606082015260800190565b5f6134716004546001600160a01b031690565b6001600160a01b031663570e1a36865f01516040015186866040518463ffffffff1660e01b81526004016134a69291906144ca565b6020604051808303815f8887f11580156134c2573d5f5f3e3d5ffd5b50505050506040513d601f19601f820116820180604052508101906134e791906144dd565b90506001600160a01b0381166135495785604051631101335b60e11b8152600401610645918152604060208201819052601b908201527f4141313320696e6974436f6465206661696c6564206f72204f4f470000000000606082015260800190565b816001600160a01b0316816001600160a01b0316146135b35785604051631101335b60e11b815260040161064591815260406020808301829052908201527f4141313420696e6974436f6465206d7573742072657475726e2073656e646572606082015260800190565b806001600160a01b03163b5f036136155785604051631101335b60e11b815260040161064591815260406020808301829052908201527f4141313520696e6974436f6465206d757374206372656174652073656e646572606082015260800190565b5f61362360148286886143bf565b61362c916143e6565b60601c9050826001600160a01b031686602001517fd51a9c61267aa6196961883ecf5ff2da6619c37dac0fa92122513fb32c032d2d83895f015160e0015160405161368d9291906001600160a01b0392831681529116602082015260400190565b60405180910390a350505050505050565b8151604081015190515f919082806136b560405190565b90505f888860200151886040516024016136d193929190614aa4565b60408051601f19818403018152919052602080820180516001600160e01b03167f19822f7c00000000000000000000000000000000000000000000000000000000178152825192935090915f9182888af192505f51955060203d14613734575f92505b61373d82604052565b50508061379757816001600160a01b03163b5f036137705787604051631101335b60e11b81526004016106459190614ac8565b8761377c610800611b03565b6040516365c8fd4d60e01b8152600401610645929190614b0a565b505050949350505050565b6001600160a01b0382165f9081526020819052604081208054838110156137cd575f92505050610d73565b839003905550600192915050565b60605f5f6137e860405190565b90505f858560200151866040015160405160240161380893929190614aa4565b60408051601f198184030181529190526020810180516001600160e01b03167f52b7512c00000000000000000000000000000000000000000000000000000000178152865160e08101516080909101518351939450909290915f9182918291829182918291829190828b8bf194503d9050805f8a3e6020890151995088519250606081039150604089019a508a5193508415806138a6575082604014155b806138b357508184601f01105b156138df578d6138c4610800611b03565b6040516365c8fd4d60e01b8152600401610645929190614b56565b601f19601f8201168901604052505050505050505050935093915050565b604080516060810182525f80825260208201819052918101919091528160a081901c65ffffffffffff81165f03613937575065ffffffffffff5b604080516060810182526001600160a01b03909316835260d09490941c602083015265ffffffffffff16928101929092525090565b5f60ff8216601f811115610d73576040517fb3512b0c00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6040518060a00160405280613a156040518061014001604052805f6001600160a01b031681526020015f81526020015f81526020015f81526020015f81526020015f81526020015f81526020015f6001600160a01b031681526020015f81526020015f81525090565b81526020015f81526020015f81526020015f81526020015f81525090565b6040518060a00160405280613a6c6040518060a001604052805f81526020015f81526020015f81526020015f8152602001606081525090565b8152602001613a8c60405180604001604052805f81526020015f81525090565b8152602001613aac60405180604001604052805f81526020015f81525090565b8152602001613acc60405180604001604052805f81526020015f81525090565b8152602001613ad9613ade565b905290565b60405180604001604052805f6001600160a01b03168152602001613ad960405180604001604052805f81526020015f81525090565b634e487b7160e01b5f52604160045260245ffd5b60a0810181811067ffffffffffffffff82111715613b4757613b47613b13565b60405250565b601f8201601f1916810167ffffffffffffffff81118282101715613b7357613b73613b13565b6040525050565b604051613b8961014082613b4d565b90565b6001600160a01b0381168114612477575f5ffd5b8035613bab81613b8c565b919050565b5f8183036101c0811215613bc2575f5ffd5b604051613bce81613b27565b809250610140821215613bdf575f5ffd5b613be7613b7a565b9150613bf284613ba0565b82526020848101359083015260408085013590830152606080850135908301526080808501359083015260a0808501359083015260c08085013590830152613c3c60e08501613ba0565b60e0830152610100848101359083015261012080850135908301529081526101408301356020820152610160830135604082015261018083013560608201526101a090920135608090920191909152919050565b5f5f83601f840112613ca0575f5ffd5b50813567ffffffffffffffff811115613cb7575f5ffd5b602083019150836020828501011115613cce575f5ffd5b9250929050565b5f5f5f5f6102008587031215613ce9575f5ffd5b843567ffffffffffffffff811115613cff575f5ffd5b8501601f81018713613d0f575f5ffd5b803567ffffffffffffffff811115613d2957613d29613b13565b604051613d40601f8301601f191660200182613b4d565b818152886020838501011115613d54575f5ffd5b816020840160208301375f60208383010152809650505050613d798660208701613bb0565b92506101e085013567ffffffffffffffff811115613d95575f5ffd5b613da187828801613c90565b95989497509550505050565b5f60208284031215613dbd575f5ffd5b81357fffffffff0000000000000000000000000000000000000000000000000000000081168114610d1c575f5ffd5b5f60208284031215613dfc575f5ffd5b813563ffffffff81168114610d1c575f5ffd5b803577ffffffffffffffffffffffffffffffffffffffffffffffff81168114613bab575f5ffd5b5f60208284031215613e46575f5ffd5b610d1c82613e0f565b5f5f60408385031215613e60575f5ffd5b8235613e6b81613b8c565b9150613e7960208401613e0f565b90509250929050565b5f5f5f5f5f60608688031215613e96575f5ffd5b853567ffffffffffffffff811115613eac575f5ffd5b613eb888828901613c90565b9096509450506020860135613ecc81613b8c565b9250604086013567ffffffffffffffff811115613ee7575f5ffd5b613ef388828901613c90565b969995985093965092949392505050565b5f5f60408385031215613f15575f5ffd5b8235613f2081613b8c565b946020939093013593505050565b5f6101208284031215613f3f575f5ffd5b50919050565b5f60208284031215613f55575f5ffd5b813567ffffffffffffffff811115613f6b575f5ffd5b61078384828501613f2e565b5f60208284031215613f87575f5ffd5b8135610d1c81613b8c565b5f5f83601f840112613fa2575f5ffd5b50813567ffffffffffffffff811115613fb9575f5ffd5b6020830191508360208260051b8501011115613cce575f5ffd5b5f5f5f60408486031215613fe5575f5ffd5b833567ffffffffffffffff811115613ffb575f5ffd5b61400786828701613f92565b909450925050602084013561401b81613b8c565b809150509250925092565b5f81518084528060208401602086015e5f602082860101526020601f19601f83011685010191505092915050565b7fff000000000000000000000000000000000000000000000000000000000000008816815260e060208201525f61408e60e0830189614026565b82810360408401526140a08189614026565b606084018890526001600160a01b038716608085015260a0840186905283810360c0850152845180825260208087019350909101905f5b818110156140f55783518352602093840193909201916001016140d7565b50909b9a5050505050505050505050565b5f5f5f60408486031215614118575f5ffd5b833561412381613b8c565b9250602084013567ffffffffffffffff81111561413e575f5ffd5b61414a86828701613c90565b9497909650939450505050565b5f5f5f5f6060858703121561416a575f5ffd5b843567ffffffffffffffff811115614180575f5ffd5b61418c87828801613f2e565b945050602085013561419d81613b8c565b9250604085013567ffffffffffffffff811115613d95575f5ffd5b60208152815160208201526020820151604082015260408201516060820152606082015160808201526080820151151560a08201525f60a083015160c08084015261078360e0840182614026565b5f5f60208385031215614217575f5ffd5b823567ffffffffffffffff81111561422d575f5ffd5b61423985828601613c90565b90969095509350505050565b602080825282516101408383015280516101608401529081015161018083015260408101516101a083015260608101516101c08301526080015160a06101e08301525f90614297610200840182614026565b905060208401516142b5604085018280518252602090810151910152565b506040840151805160808581019190915260209182015160a08601526060860151805160c087015282015160e086015285015180516001600160a01b0316610100860152808201518051610120870152909101516101408501525b509392505050565b634e487b7160e01b5f52601260045260245ffd5b828152604060208201525f6107836040830184614026565b634e487b7160e01b5f52601160045260245ffd5b80820180821115610d7357610d73614344565b5f6001820161437c5761437c614344565b5060010190565b602081525f610d7360208301601981527f41413230206163636f756e74206e6f74206465706c6f79656400000000000000602082015260400190565b5f5f858511156143cd575f5ffd5b838611156143d9575f5ffd5b5050820193919092039150565b80356bffffffffffffffffffffffff19811690601484101561442c576bffffffffffffffffffffffff196bffffffffffffffffffffffff198560140360031b1b82161691505b5092915050565b81810381811115610d7357610d73614344565b634e487b7160e01b5f52603260045260245ffd5b5f823561011e1983360301811261446f575f5ffd5b9190910192915050565b818382375f9101908152919050565b8215158152604060208201525f6107836040830184614026565b81835281816020850137505f828201602090810191909152601f909101601f19169091010190565b602081525f6107836020830184866144a2565b5f602082840312156144ed575f5ffd5b8151610d1c81613b8c565b65ffffffffffff8181168382160190811115610d7357610d73614344565b5f5f8335601e1984360301811261452b575f5ffd5b83018035915067ffffffffffffffff821115614545575f5ffd5b602001915036819003821315613cce575f5ffd5b5f8235605e1983360301811261446f575f5ffd5b5f5f8335601e19843603018112614582575f5ffd5b83018035915067ffffffffffffffff82111561459c575f5ffd5b6020019150600581901b3603821315613cce575f5ffd5b5f5f8335601e198436030181126145c8575f5ffd5b830160208101925035905067ffffffffffffffff8111156145e7575f5ffd5b803603821315613cce575f5ffd5b61460f8261460283613ba0565b6001600160a01b03169052565b602081810135908301525f61462760408301836145b3565b610120604086015261463e610120860182846144a2565b91505061464e60608401846145b3565b85830360608701526146618382846144a2565b6080868101359088015260a0808701359088015260c08087013590880152925061469191505060e08401846145b3565b85830360e08701526146a48382846144a2565b925050506146b66101008401846145b3565b8583036101008701526146ca8382846144a2565b9695505050505050565b604080825281018490525f6060600586901b83018101908301878361011e1936839003015b8982101561473d57868503605f190184528235818112614717575f5ffd5b614723868d83016145f5565b9550506020830192506020840193506001820191506146f9565b5050505082810360208401526147548185876144a2565b979650505050505050565b634e487b7160e01b5f52602160045260245ffd5b5f6003861061479057634e487b7160e01b5f52602160045260245ffd5b858252608060208301526147a76080830186614026565b6040830194909452506060015292915050565b602081525f610d1c6020830184614026565b6bffffffffffffffffffffffff198460601b168152818360148301375f910160140190815292915050565b604081525f61480960408301856145f5565b90508260208301529392505050565b805180516001600160a01b031683526020810151602084015260408101516040840152606081015160608401526080810151608084015260a081015160a084015260c081015160c084015260e081015161487d60e08501826001600160a01b03169052565b5061010081810151908401526101209081015190830152602081015161014083015260408101516101608301526060810151610180830152608001516101a090910152565b61020081525f6148d6610200830186614026565b6148e36020840186614818565b8281036101e08401526146ca8185614026565b61020081525f61490b610200830186886144a2565b6149186020840186614818565b8281036101e08401526147548185614026565b606081525f61493e6060830187896144a2565b6001600160a01b038616602084015282810360408401526149608185876144a2565b98975050505050505050565b5f60033d1115613b895760045f5f3e505f5160e01c90565b5f60443d10156149915790565b6040513d600319016004823e80513d602482011167ffffffffffffffff821117156149bb57505090565b808201805167ffffffffffffffff8111156149d7575050505090565b3d84016003190182820160200111156149f1575050505090565b61431060208285010185613b4d565b600181811c90821680614a1457607f821691505b602082108103613f3f57634e487b7160e01b5f52602260045260245ffd5b80356fffffffffffffffffffffffffffffffff19811690601084101561442c576fffffffffffffffffffffffffffffffff19808560100360031b1b82161691505092915050565b6001600160a01b0384168152604060208201525f614a9b6040830184866144a2565b95945050505050565b606081525f614ab660608301866145f5565b60208301949094525060400152919050565b818152604060208201525f610d1c60408301601981527f41413230206163636f756e74206e6f74206465706c6f79656400000000000000602082015260400190565b82815260606020820152600d60608201527f4141323320726576657274656400000000000000000000000000000000000000608082015260a060408201525f61078360a0830184614026565b82815260606020820152600d60608201527f4141333320726576657274656400000000000000000000000000000000000000608082015260a060408201525f61078360a083018461402656fea26469706673582212203b7bda54d1e42199f724a9c48a3a776c9a81b66d5bd3987b3924d5c6b409ac5564736f6c634300081c0033'
