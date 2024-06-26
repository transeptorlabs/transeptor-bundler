export const GET_CODE_HASH_ABI = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'addresses',
        type: 'address[]',
        internalType: 'address[]',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getCodeHashes',
    inputs: [
      {
        name: 'addresses',
        type: 'address[]',
        internalType: 'address[]',
      },
    ],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'error',
    name: 'CodeHashesResult',
    inputs: [{ name: 'hash', type: 'bytes32', internalType: 'bytes32' }],
  },
]

export const GET_CODE_HASH_BYTECODE =
  '0x608060405234801561001057600080fd5b5060405161027f38038061027f83398101604081905261002f91610160565b6100388161005d565b60405163091cd00560e01b815260040161005491815260200190565b60405180910390fd5b60008082516001600160401b038111156100795761007961012e565b6040519080825280602002602001820160405280156100a2578160200160208202803683370190505b50905060005b83518110156100fa578381815181106100c3576100c3610224565b60200260200101516001600160a01b03163f8282815181106100e7576100e7610224565b60209081029190910101526001016100a8565b5060008160405160200161010e919061023a565b60408051601f198184030181529190528051602090910120949350505050565b634e487b7160e01b600052604160045260246000fd5b80516001600160a01b038116811461015b57600080fd5b919050565b6000602080838503121561017357600080fd5b82516001600160401b038082111561018a57600080fd5b818501915085601f83011261019e57600080fd5b8151818111156101b0576101b061012e565b8060051b604051601f19603f830116810181811085821117156101d5576101d561012e565b6040529182528482019250838101850191888311156101f357600080fd5b938501935b828510156102185761020985610144565b845293850193928501926101f8565b98975050505050505050565b634e487b7160e01b600052603260045260246000fd5b6020808252825182820181905260009190848201906040850190845b8181101561027257835183529284019291840191600101610256565b5090969550505050505056fe'

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
            internalType: 'bytes32',
            name: 'accountGasLimits',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'preVerificationGas',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'gasFees',
            type: 'bytes32',
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
        internalType: 'struct PackedUserOperation[]',
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
            internalType: 'bytes32',
            name: 'accountGasLimits',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'preVerificationGas',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'gasFees',
            type: 'bytes32',
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
        internalType: 'struct PackedUserOperation[]',
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
  '0x60806040523480156200001157600080fd5b50604051620005fe380380620005fe8339810160408190526200003491620002b4565b62000040828262000064565b604051628f37ad60e51b81526004016200005b91906200048d565b60405180910390fd5b606081516001600160401b0381111562000082576200008262000193565b604051908082528060200260200182016040528015620000ac578160200160208202803683370190505b50905060005b82518110156200017357836001600160a01b03166322cdde4c848381518110620000e057620000e0620004d3565b60200260200101516040518263ffffffff1660e01b815260040162000106919062000517565b602060405180830381865afa15801562000124573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906200014a9190620005e3565b8282815181106200015f576200015f620004d3565b6020908102919091010152600101620000b2565b5092915050565b6001600160a01b03811681146200019057600080fd5b50565b634e487b7160e01b600052604160045260246000fd5b60405161012081016001600160401b0381118282101715620001cf57620001cf62000193565b60405290565b604051601f8201601f191681016001600160401b038111828210171562000200576200020062000193565b604052919050565b805162000215816200017a565b919050565b60005b83811015620002375781810151838201526020016200021d565b50506000910152565b600082601f8301126200025257600080fd5b81516001600160401b038111156200026e576200026e62000193565b62000283601f8201601f1916602001620001d5565b8181528460208386010111156200029957600080fd5b620002ac8260208301602087016200021a565b949350505050565b60008060408385031215620002c857600080fd5b8251620002d5816200017a565b602084810151919350906001600160401b0380821115620002f557600080fd5b818601915086601f8301126200030a57600080fd5b8151818111156200031f576200031f62000193565b8060051b62000330858201620001d5565b918252838101850191858101908a8411156200034b57600080fd5b86860192505b838310156200047c578251858111156200036a57600080fd5b8601610120818d03601f190112156200038257600080fd5b6200038c620001a9565b6200039989830162000208565b8152604082015189820152606082015187811115620003b757600080fd5b620003c78e8b8386010162000240565b604083015250608082015187811115620003e057600080fd5b620003f08e8b8386010162000240565b60608301525060a0820151608082015260c082015160a082015260e082015160c082015261010080830151888111156200042957600080fd5b620004398f8c8387010162000240565b60e084015250610120830151888111156200045357600080fd5b620004638f8c8387010162000240565b9183019190915250835250918601919086019062000351565b809750505050505050509250929050565b6020808252825182820181905260009190848201906040850190845b81811015620004c757835183529284019291840191600101620004a9565b50909695505050505050565b634e487b7160e01b600052603260045260246000fd5b60008151808452620005038160208601602086016200021a565b601f01601f19169290920160200192915050565b60208152620005326020820183516001600160a01b03169052565b60208201516040820152600060408301516101208060608501526200055c610140850183620004e9565b91506060850151601f19808685030160808701526200057c8483620004e9565b9350608087015160a087015260a087015160c087015260c087015160e087015260e08701519150610100818786030181880152620005bb8584620004e9565b908801518782039092018488015293509050620005d98382620004e9565b9695505050505050565b600060208284031215620005f657600080fd5b505191905056fe'

export const I_TestPaymasterRevertCustomError_abi = [
  {
    inputs: [
      {
        internalType: 'contract IEntryPoint',
        name: '_entryPoint',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'customReason',
        type: 'string',
      },
    ],
    name: 'CustomError',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'OwnableInvalidOwner',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'OwnableUnauthorizedAccount',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
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
    inputs: [],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'entryPoint',
    outputs: [
      {
        internalType: 'contract IEntryPoint',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getDeposit',
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
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
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
      {
        internalType: 'uint256',
        name: 'actualUserOpFeePerGas',
        type: 'uint256',
      },
    ],
    name: 'postOp',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'enum TestPaymasterRevertCustomError.RevertType',
        name: '_revertType',
        type: 'uint8',
      },
    ],
    name: 'setRevertType',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
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
            internalType: 'bytes32',
            name: 'accountGasLimits',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'preVerificationGas',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'gasFees',
            type: 'bytes32',
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
        internalType: 'struct PackedUserOperation',
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
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'withdrawTo',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

export const I_TestERC20_factory_ABI = [
  {
    inputs: [
      {
        internalType: 'uint8',
        name: '_decimals',
        type: 'uint8',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'allowance',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'needed',
        type: 'uint256',
      },
    ],
    name: 'ERC20InsufficientAllowance',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'balance',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'needed',
        type: 'uint256',
      },
    ],
    name: 'ERC20InsufficientBalance',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'approver',
        type: 'address',
      },
    ],
    name: 'ERC20InvalidApprover',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'receiver',
        type: 'address',
      },
    ],
    name: 'ERC20InvalidReceiver',
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
    name: 'ERC20InvalidSender',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
    ],
    name: 'ERC20InvalidSpender',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
    ],
    name: 'allowance',
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
        name: 'spender',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'approve',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
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
    inputs: [],
    name: 'decimals',
    outputs: [
      {
        internalType: 'uint8',
        name: '',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'sudoApprove',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'sudoMint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_to',
        type: 'address',
      },
    ],
    name: 'sudoTransfer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
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
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'transfer',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'transferFrom',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]
