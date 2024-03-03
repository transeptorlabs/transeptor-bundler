import { hexZeroPad, hexlify } from 'ethers/lib/utils'
import { BigNumber, BytesLike } from 'ethers'
import { SlotMap, StorageMap, UserOperation } from 'types'
import { PackedUserOperation } from 'types/src/userop.types'

// extract address from initCode or paymasterAndData
export function getAddr (data?: BytesLike): string | undefined {
    if (data == null) {
      return undefined
    }
    const str = hexlify(data)
    if (str.length >= 42) {
      return str.slice(0, 42)
    }
    return undefined
}

/**
 * merge all validationStorageMap objects into merged map
 * - entry with "root" (string) is always preferred over entry with slot-map
 * - merge slot entries
 * NOTE: slot values are supposed to be the value before the transaction started.
 *  so same address/slot in different validations should carry the same value
 * @param mergedStorageMap
 * @param validationStorageMap
 */
export function mergeStorageMap (mergedStorageMap: StorageMap, validationStorageMap: StorageMap): StorageMap {
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

export function packUserOp(userOp: UserOperation): PackedUserOperation {
  return {
    sender: userOp.sender,
    nonce: userOp.nonce,
    initCode: userOp.initCode,
    callData: userOp.callData,
    accountGasLimits: hexZeroPad(BigNumber.from(userOp.verificationGasLimit).shl(128).add(userOp.callGasLimit).toHexString(),32),
    preVerificationGas: userOp.preVerificationGas,
    gasFees: hexZeroPad(BigNumber.from(userOp.maxPriorityFeePerGas).shl(128).add(userOp.maxFeePerGas).toHexString(), 32),
    paymasterAndData: userOp.paymasterAndData,
    signature: userOp.signature
  }
}

export function unpackUserOp(packedUserOp: PackedUserOperation): UserOperation {

  function unpackUint(packed: BytesLike): [BigNumber, BigNumber] {
    const packedNumber: BigNumber = BigNumber.from(packed)
    return [packedNumber.shr(128), packedNumber.and(BigNumber.from(1).shl(128).sub(1))]
  }

  const [verificationGasLimit, callGasLimit] = unpackUint(packedUserOp.accountGasLimits)
  const [maxPriorityFeePerGas, maxFeePerGas] = unpackUint(packedUserOp.gasFees)

  return {
    sender: packedUserOp.sender,
    nonce: packedUserOp.nonce,
    initCode: packedUserOp.initCode,
    callData: packedUserOp.callData,
    verificationGasLimit: verificationGasLimit,
    callGasLimit: callGasLimit,
    preVerificationGas: packedUserOp.preVerificationGas,
    maxPriorityFeePerGas: maxPriorityFeePerGas,
    maxFeePerGas: maxFeePerGas,
    paymasterAndData: packedUserOp.paymasterAndData,
    signature: packedUserOp.signature
  }
}

export function packUserOps(userOps: UserOperation[]): PackedUserOperation[] {
  return userOps.map(packUserOp)
}
