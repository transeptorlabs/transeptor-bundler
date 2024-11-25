import {
  BigNumberish,
  BytesLike,
  hexlify,
  keccak256,
  zeroPadValue,
  ethers,
  AbiCoder,
  toBeHex,
} from 'ethers'

import {
  SlotMap,
  StorageMap,
  UserOperation,
  PackedUserOperation,
} from '../types/index.js'

/**
 * Merge all validationStorageMap objects into merged map
 * - entry with "root" (string) is always preferred over entry with slot-map
 * - merge slot entries
 * NOTE: slot values are supposed to be the value before the transaction started.
 * so same address/slot in different validations should carry the same value
 *
 * @param mergedStorageMap - merged storage map.
 * @param validationStorageMap - validation storage map.
 * @returns mergedStorageMap
 */
export function mergeStorageMap(
  mergedStorageMap: StorageMap,
  validationStorageMap: StorageMap,
): StorageMap {
  Object.entries(validationStorageMap).forEach(([addr, validationEntry]) => {
    if (typeof validationEntry === 'string') {
      // it's a root. override specific slots, if any
      mergedStorageMap[addr] = validationEntry
    } else if (typeof mergedStorageMap[addr] === 'string') {
      // merged address already contains a root. ignore specific slot values
    } else {
      let slots: SlotMap
      if (mergedStorageMap[addr] == null) {
        slots = mergedStorageMap[addr] = {}
      } else {
        slots = mergedStorageMap[addr] as SlotMap
      }

      Object.entries(validationEntry).forEach(([slot, val]) => {
        slots[slot] = val
      })
    }
  })
  return mergedStorageMap
}

/**
 * Pack a uint256 into 2 uint128.
 *
 * @param high128 - high 128 bits
 * @param low128 - low 128 bits
 * @returns packed uint256.
 */
function packUint(high128: BigNumberish, low128: BigNumberish): string {
  return zeroPadValue(toBeHex((BigInt(high128) << 128n) + BigInt(low128)), 32)
}

/**
 * Unpack a packed uint.
 *
 * @param packed - packed uint
 * @returns high128, low128
 */
function unpackUint(packed: BytesLike): [high128: bigint, low128: bigint] {
  const packedNumber = BigInt(hexlify(packed))

  return [packedNumber >> 128n, packedNumber & ((1n << 128n) - 1n)]
}

/**
 * Pack a paymaster data.
 *
 * @param paymaster - address of the paymaster contract.
 * @param paymasterVerificationGasLimit - gas limit for the paymaster verification.
 * @param postOpGasLimit  - gas limit for the post-operation.
 * @param paymasterData - optional data to be passed to the paymaster contract.
 * @returns packed paymaster data.
 */
function packPaymasterData(
  paymaster: string,
  paymasterVerificationGasLimit: BigNumberish,
  postOpGasLimit: BigNumberish,
  paymasterData?: BytesLike,
): BytesLike {
  return hexConcat([
    paymaster,
    packUint(paymasterVerificationGasLimit, postOpGasLimit),
    paymasterData ?? '0x',
  ])
}

/**
 * Check if the value is a hex string.
 *
 * @param value - value to check
 * @param length - length of the hex string
 * @returns true if the value is a hex string
 */
function isHexString(value: any, length?: number): boolean {
  if (typeof value !== 'string' || !value.match(/^0x[0-9A-Fa-f]*$/)) {
    return false
  }
  if (length && value.length !== 2 + 2 * length) {
    return false
  }
  return true
}

/**
 * Get the length of the hex data.
 *
 * @param data - hex data
 * @returns length of the data
 */
function hexDataLength(data: BytesLike) {
  if (typeof data !== 'string') {
    data = hexlify(data)
  } else if (!isHexString(data) || data.length % 2) {
    return null
  }

  return (data.length - 2) / 2
}

/**
 * Unpack a packed paymaster data.
 *
 * @param paymasterAndData - packed paymaster data.
 * @returns paymaster, paymasterVerificationGas, postOpGasLimit, paymasterData
 */
function unpackPaymasterAndData(paymasterAndData: BytesLike): {
  paymaster: string
  paymasterVerificationGas: bigint
  postOpGasLimit: bigint
  paymasterData: BytesLike
} | null {
  if (paymasterAndData.length <= 2) return null
  if (hexDataLength(paymasterAndData) < 52) {
    // if length is non-zero, then must at least host paymaster address and gas-limits
    throw new Error(`invalid PaymasterAndData: ${paymasterAndData as string}`)
  }
  const [paymasterVerificationGas, postOpGasLimit] = unpackUint(
    ethers.dataSlice(paymasterAndData, 20, 52),
  )
  return {
    paymaster: ethers.dataSlice(paymasterAndData, 0, 20),
    paymasterVerificationGas,
    postOpGasLimit,
    paymasterData: ethers.dataSlice(paymasterAndData, 52),
  }
}

/**
 * Concatenate multiple byte arrays.
 *
 * @param items - array of bytes
 * @returns concatenated bytes
 */
function hexConcat(items: ReadonlyArray<BytesLike>): string {
  let result = '0x'
  items.forEach((item) => {
    result += hexlify(item).substring(2)
  })
  return result
}

/**
 * Pack a UserOperation to a PackedUserOperation.
 *
 * @param userOp a UserOperation.
 * @returns a PackedUserOperation.
 */
export function packUserOp(userOp: UserOperation): PackedUserOperation {
  let paymasterAndData: BytesLike
  if (userOp.paymaster == null) {
    paymasterAndData = '0x'
  } else {
    if (
      userOp.paymasterVerificationGasLimit == null ||
      userOp.paymasterPostOpGasLimit == null
    ) {
      throw new Error('paymaster with no gas limits')
    }
    paymasterAndData = packPaymasterData(
      userOp.paymaster,
      userOp.paymasterVerificationGasLimit,
      userOp.paymasterPostOpGasLimit,
      userOp.paymasterData,
    )
  }

  return {
    sender: userOp.sender,
    nonce: userOp.nonce,
    initCode:
      userOp.factory == null
        ? '0x'
        : hexConcat([userOp.factory, userOp.factoryData ?? '']),
    callData: userOp.callData,
    accountGasLimits: packUint(
      userOp.verificationGasLimit,
      userOp.callGasLimit,
    ),
    preVerificationGas: userOp.preVerificationGas,
    gasFees: packUint(userOp.maxPriorityFeePerGas, userOp.maxFeePerGas),
    paymasterAndData,
    signature: userOp.signature,
  }
}

/**
 * Unpack a PackedUserOperation to a UserOperation.
 *
 * @param packedUserOp a PackedUserOperation.
 * @returns a UserOperation.
 */
export function unpackUserOp(packedUserOp: PackedUserOperation): UserOperation {
  const [verificationGasLimit, callGasLimit] = unpackUint(
    packedUserOp.accountGasLimits,
  )
  const [maxPriorityFeePerGas, maxFeePerGas] = unpackUint(packedUserOp.gasFees)

  let ret: UserOperation = {
    sender: packedUserOp.sender,
    nonce: packedUserOp.nonce,
    callData: packedUserOp.callData,
    preVerificationGas: packedUserOp.preVerificationGas,
    verificationGasLimit,
    callGasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    signature: packedUserOp.signature,
  }
  if (packedUserOp.initCode != null && packedUserOp.initCode.length > 2) {
    const factory = ethers.dataSlice(packedUserOp.initCode, 0, 20)
    const factoryData = ethers.dataSlice(packedUserOp.initCode, 20)
    ret = {
      ...ret,
      factory,
      factoryData,
    }
  }
  const pmData = unpackPaymasterAndData(packedUserOp.paymasterAndData)
  if (pmData != null) {
    ret = {
      ...ret,
      paymaster: pmData.paymaster,
      paymasterVerificationGasLimit: pmData.paymasterVerificationGas,
      paymasterPostOpGasLimit: pmData.postOpGasLimit,
      paymasterData: pmData.paymasterData,
    }
  }
  return ret
}

/**
 * Convert an array of UserOperation to an array of PackedUserOperation.
 *
 * @param userOps an array of UserOperation.
 * @returns an array of PackedUserOperation.
 */
export function packUserOps(userOps: UserOperation[]): PackedUserOperation[] {
  return userOps.map(packUserOp)
}

/**
 * abi-encode the userOperation.
 *
 * @param op1 a PackedUserOp or UserOp.
 * @param forSignature "true" if the hash is needed to calculate the getUserOpHash()
 *  "false" to pack entire UserOp, for calculating the calldata cost of putting it on-chain.
 * @returns the abi-encoded userOperation
 */
export function encodeUserOp(
  op1: PackedUserOperation | UserOperation,
  forSignature = true,
): string {
  // if "op" is unpacked UserOperation, then pack it first, before we ABI-encode it.
  let op: PackedUserOperation
  if ('callGasLimit' in op1) {
    op = packUserOp(op1)
  } else {
    op = op1
  }

  if (forSignature) {
    return AbiCoder.defaultAbiCoder().encode(
      [
        'address',
        'uint256',
        'bytes32',
        'bytes32',
        'bytes32',
        'uint256',
        'bytes32',
        'bytes32',
      ],
      [
        op.sender,
        op.nonce,
        keccak256(op.initCode),
        keccak256(op.callData),
        op.accountGasLimits,
        op.preVerificationGas,
        op.gasFees,
        keccak256(op.paymasterAndData),
      ],
    )
  } else {
    // for the purpose of calculating gas cost encode also signature (and no keccak of bytes)
    return AbiCoder.defaultAbiCoder().encode(
      [
        'address',
        'uint256',
        'bytes',
        'bytes',
        'bytes32',
        'uint256',
        'bytes32',
        'bytes',
        'bytes',
      ],
      [
        op.sender,
        op.nonce,
        op.initCode,
        op.callData,
        op.accountGasLimits,
        op.preVerificationGas,
        op.gasFees,
        op.paymasterAndData,
        op.signature,
      ],
    )
  }
}
