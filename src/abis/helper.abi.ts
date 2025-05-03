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
  '0x608060405234801561000f575f5ffd5b5060405161027a38038061027a83398101604081905261002e91610159565b6100378161005c565b60405163091cd00560e01b815260040161005391815260200190565b60405180910390fd5b5f5f82516001600160401b038111156100775761007761012a565b6040519080825280602002602001820160405280156100a0578160200160208202803683370190505b5090505f5b83518110156100f7578381815181106100c0576100c0610223565b60200260200101516001600160a01b03163f8282815181106100e4576100e4610223565b60209081029190910101526001016100a5565b505f8160405160200161010a9190610237565b60408051601f198184030181529190528051602090910120949350505050565b634e487b7160e01b5f52604160045260245ffd5b80516001600160a01b0381168114610154575f5ffd5b919050565b5f60208284031215610169575f5ffd5b81516001600160401b0381111561017e575f5ffd5b8201601f8101841361018e575f5ffd5b80516001600160401b038111156101a7576101a761012a565b604051600582901b90603f8201601f191681016001600160401b03811182821017156101d5576101d561012a565b6040529182526020818401810192908101878411156101f2575f5ffd5b6020850194505b838510156102185761020a8561013e565b8152602094850194016101f9565b509695505050505050565b634e487b7160e01b5f52603260045260245ffd5b602080825282518282018190525f918401906040840190835b8181101561026e578351835260209384019390920191600101610250565b50909594505050505056fe'

export const GET_USEROP_HASHES_ABI = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'entryPoint',
        type: 'address',
        internalType: 'contract IEntryPoint',
      },
      {
        name: 'packedUserOps',
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
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getUserOpHashes',
    inputs: [
      {
        name: 'entryPoint',
        type: 'address',
        internalType: 'contract IEntryPoint',
      },
      {
        name: 'packedUserOps',
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
    ],
    outputs: [{ name: 'ret', type: 'bytes32[]', internalType: 'bytes32[]' }],
    stateMutability: 'view',
  },
  {
    type: 'error',
    name: 'UserOpHashesResult',
    inputs: [
      {
        name: 'userOpHashes',
        type: 'bytes32[]',
        internalType: 'bytes32[]',
      },
    ],
  },
]

export const GET_USEROP_HASHES_BYTECODE =
  '0x608060405234801561000f575f5ffd5b5060405161059838038061059883398101604081905261002e9161025b565b610038828261005a565b604051628f37ad60e51b81526004016100519190610439565b60405180910390fd5b606081516001600160401b0381111561007557610075610173565b60405190808252806020026020018201604052801561009e578160200160208202803683370190505b5090505f5b825181101561015557836001600160a01b03166322cdde4c8483815181106100cd576100cd61047b565b60200260200101516040518263ffffffff1660e01b81526004016100f191906104bd565b602060405180830381865afa15801561010c573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906101309190610580565b8282815181106101425761014261047b565b60209081029190910101526001016100a3565b5092915050565b6001600160a01b0381168114610170575f5ffd5b50565b634e487b7160e01b5f52604160045260245ffd5b60405161012081016001600160401b03811182821017156101aa576101aa610173565b60405290565b604051601f8201601f191681016001600160401b03811182821017156101d8576101d8610173565b604052919050565b80516101eb8161015c565b919050565b5f82601f8301126101ff575f5ffd5b81516001600160401b0381111561021857610218610173565b61022b601f8201601f19166020016101b0565b81815284602083860101111561023f575f5ffd5b8160208501602083015e5f918101602001919091529392505050565b5f5f6040838503121561026c575f5ffd5b82516102778161015c565b60208401519092506001600160401b03811115610292575f5ffd5b8301601f810185136102a2575f5ffd5b80516001600160401b038111156102bb576102bb610173565b8060051b6102cb602082016101b0565b918252602081840181019290810190888411156102e6575f5ffd5b6020850192505b8383101561042a5782516001600160401b0381111561030a575f5ffd5b8501610120818b03601f19011215610320575f5ffd5b610328610187565b610334602083016101e0565b81526040820151602082015260608201516001600160401b03811115610358575f5ffd5b6103678c6020838601016101f0565b60408301525060808201516001600160401b03811115610385575f5ffd5b6103948c6020838601016101f0565b60608301525060a082810151608083015260c0808401519183019190915260e0830151908201526101008201516001600160401b038111156103d4575f5ffd5b6103e38c6020838601016101f0565b60e0830152506101208201516001600160401b03811115610402575f5ffd5b6104118c6020838601016101f0565b61010083015250835250602092830192909101906102ed565b80955050505050509250929050565b602080825282518282018190525f918401906040840190835b81811015610470578351835260209384019390920191600101610452565b509095945050505050565b634e487b7160e01b5f52603260045260245ffd5b5f81518084528060208401602086015e5f602082860101526020601f19601f83011685010191505092915050565b602081526104d76020820183516001600160a01b03169052565b602082015160408201525f604083015161012060608401526104fd61014084018261048f565b90506060840151601f1984830301608085015261051a828261048f565b915050608084015160a084015260a084015160c084015260c084015160e084015260e0840151601f1984830301610100850152610557828261048f565b915050610100840151601f1984830301610120850152610577828261048f565b95945050505050565b5f60208284031215610590575f5ffd5b505191905056fe'

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
