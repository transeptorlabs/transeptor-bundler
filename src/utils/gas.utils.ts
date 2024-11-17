import { arrayify, hexlify } from 'ethers/lib/utils.js'

import { UserOperation } from '../types/index.js'

import { packUserOp, encodeUserOp } from './bundle.utils.js'
import { BigNumber } from 'ethers'

export type PreVerificationGasCalculator = {
  /**
   * Cost of sending a basic transaction on the current chain.
   */
  readonly transactionGasStipend: number
  /**
   * Gas overhead is added to entire 'handleOp' bundle.
   */
  readonly fixedGasOverhead: number
  /**
   * Gas overhead per UserOperation is added on top of the above fixed per-bundle.
   */
  readonly perUserOpGasOverhead: number
  /**
   * Gas overhead per single "word" (32 bytes) of an ABI-encoding of the UserOperation.
   */
  readonly perUserOpWordGasOverhead: number
  /**
   * The gas cost of a single zero byte an ABI-encoding of the UserOperation.
   */
  readonly zeroByteGasCost: number
  /**
   * The gas cost of a single zero byte an ABI-encoding of the UserOperation.
   */
  readonly nonZeroByteGasCost: number
  /**
   * The expected average size of a bundle in current network conditions.
   * This value is used to split the bundle gas overhead between all ops.
   */
  readonly expectedBundleSize: number
  /**
   * The size of the dummy 'signature' parameter to be used during estimation.
   */
  readonly estimationSignatureSize: number
  /**
   * The size of the dummy 'paymasterData' parameter to be used during estimation.
   */
  readonly estimationPaymasterDataSize: number
}

const mainnetConfig: PreVerificationGasCalculator = {
  transactionGasStipend: 21000,
  fixedGasOverhead: 38000,
  perUserOpGasOverhead: 11000,
  perUserOpWordGasOverhead: 4,
  zeroByteGasCost: 4,
  nonZeroByteGasCost: 16,
  expectedBundleSize: 1,
  estimationSignatureSize: 65,
  estimationPaymasterDataSize: 0,
}

const chainConfigs: Record<number, PreVerificationGasCalculator> = {
  1: mainnetConfig,
  1337: mainnetConfig,
  31337: mainnetConfig,
}

const fillUserOpWithDummyData = (
  userOp: Partial<UserOperation>,
  gasConfig: PreVerificationGasCalculator,
): UserOperation => {
  const filledUserOp: UserOperation = Object.assign({}, userOp) as UserOperation
  filledUserOp.preVerificationGas = filledUserOp.preVerificationGas ?? 21000
  filledUserOp.signature =
    filledUserOp.signature ??
    hexlify(Buffer.alloc(gasConfig.estimationSignatureSize, 0xff))
  filledUserOp.paymasterData =
    filledUserOp.paymasterData ??
    hexlify(Buffer.alloc(gasConfig.estimationPaymasterDataSize, 0xff))
  return filledUserOp
}

const calculate = (
  userOp: UserOperation,
  gasConfig: PreVerificationGasCalculator,
): number => {
  const packed = arrayify(encodeUserOp(packUserOp(userOp), false))
  const lengthInWord = (packed.length + 31) / 32
  const callDataCost = packed
    .map((x) =>
      x === 0 ? gasConfig.zeroByteGasCost : gasConfig.nonZeroByteGasCost,
    )
    .reduce((sum, x) => sum + x)

  const dataWordsOverhead = lengthInWord * gasConfig.perUserOpWordGasOverhead
  const specificOverhead =
    callDataCost + dataWordsOverhead + gasConfig.perUserOpGasOverhead
  const shareOfBundleCost =
    gasConfig.fixedGasOverhead / gasConfig.expectedBundleSize

  return Math.round(specificOverhead + shareOfBundleCost)
}

/**
 * Calculate the gas cost of the pre-verification of the userOp.
 * The 'preVerificationGas' is the cost overhead that cannot be calculated precisely or accessed on-chain.
 * It is dependent on the blockchain parameters defefined for all transactions.
 *
 * @param userOp - The UserOperation to calculate the gas cost for.
 * @param chainId - The chainId of the chain where the operation will be executed.
 * @returns the gas cost of the pre-verification of the userOp
 */
export const calcPreVerificationGas = (
  userOp: Partial<UserOperation>,
  chainId: number,
): number => {
  const gasConfig = chainConfigs[chainId]
  if (!gasConfig) {
    throw new Error(`Unsupported chainId: ${chainId}`)
  }
  const filledUserOp = fillUserOpWithDummyData(userOp, gasConfig)
  return calculate(filledUserOp, gasConfig)
}

export const validatePreVerificationGas = (
  userOp: UserOperation,
  chainId: number,
): {
  isPreVerificationGasValid: boolean
  minRequiredPreVerificationGas: number
} => {
  const gasConfig = chainConfigs[chainId]
  if (!gasConfig) {
    throw new Error(`Unsupported chainId: ${chainId}`)
  }
  const minRequiredPreVerificationGas = calculate(userOp, gasConfig)
  return {
    minRequiredPreVerificationGas,
    isPreVerificationGasValid:
      minRequiredPreVerificationGas <=
      BigNumber.from(userOp.preVerificationGas).toNumber(),
  }
}
