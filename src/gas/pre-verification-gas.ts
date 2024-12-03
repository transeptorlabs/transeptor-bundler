import { ethers, hexlify } from 'ethers'
import { UserOperation } from '../types/index.js'

import { packUserOp, encodeUserOp } from '../utils/bundle.utils.js'

export type PreVerificationGasCalculator = {
  /**
   * Calculate the gas cost of the pre-verification of the userOp.
   * The 'preVerificationGas' is the cost overhead that cannot be calculated precisely or accessed on-chain.
   * It is dependent on the blockchain parameters defined for all transactions.
   *
   * @param userOp - The UserOperation to calculate the gas cost for.
   * @returns the gas cost of the pre-verification of the userOp
   */
  calcPreVerificationGas: (userOp: Partial<UserOperation>) => number

  validatePreVerificationGas: (userOp: UserOperation) => {
    isPreVerificationGasValid: boolean
    minRequiredPreVerificationGas: number
  }

  updateGasConfig: (config: Partial<PreVerificationGasConfig>) => void
}

export type PreVerificationGasConfig = {
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

const MAINNET_CONFIG: PreVerificationGasConfig = {
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

const CHAIN_CONFIG: Record<number, PreVerificationGasConfig> = {
  1: MAINNET_CONFIG,
  1337: MAINNET_CONFIG,
  31337: MAINNET_CONFIG,
  11155111: MAINNET_CONFIG,
}

const fillUserOpWithDummyData = (
  userOp: Partial<UserOperation>,
  gasConfig: PreVerificationGasConfig,
): UserOperation => {
  const filledUserOp: UserOperation = Object.assign({}, userOp) as UserOperation
  const uint8ArraySignature = new Uint8Array(
    Buffer.alloc(gasConfig.estimationSignatureSize, 0xff),
  )
  const uint8ArrayPaymasterData = new Uint8Array(
    Buffer.alloc(gasConfig.estimationPaymasterDataSize, 0xff),
  )

  filledUserOp.preVerificationGas = filledUserOp.preVerificationGas ?? 21000
  filledUserOp.signature =
    filledUserOp.signature ?? hexlify(uint8ArraySignature)
  filledUserOp.paymasterData =
    filledUserOp.paymasterData ?? hexlify(uint8ArrayPaymasterData)
  return filledUserOp
}

const calculate = (
  userOp: UserOperation,
  gasConfig: PreVerificationGasConfig,
): number => {
  const packed = ethers.getBytes(encodeUserOp(packUserOp(userOp), false))
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

export const createPreVerificationGasCalculator = (
  chainId: number,
): PreVerificationGasCalculator => {
  let gasConfig = CHAIN_CONFIG[chainId]
  if (!gasConfig) {
    throw new Error(`Unsupported chainId: ${chainId}`)
  }

  return {
    updateGasConfig: (config: Partial<PreVerificationGasConfig>): void => {
      gasConfig = Object.assign({}, gasConfig, config)
    },
    calcPreVerificationGas: (userOp: Partial<UserOperation>): number => {
      const filledUserOp = fillUserOpWithDummyData(userOp, gasConfig)
      return calculate(filledUserOp, gasConfig)
    },

    validatePreVerificationGas: (
      userOp: UserOperation,
    ): {
      isPreVerificationGasValid: boolean
      minRequiredPreVerificationGas: number
    } => {
      const minRequiredPreVerificationGas = calculate(userOp, gasConfig)
      return {
        minRequiredPreVerificationGas,
        isPreVerificationGasValid:
          minRequiredPreVerificationGas <=
          Number(BigInt(userOp.preVerificationGas)),
      }
    },
  }
}
