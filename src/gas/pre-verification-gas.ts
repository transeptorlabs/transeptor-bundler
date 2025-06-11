import { ethers, hexlify, dataLength, BytesLike } from 'ethers'
import { UserOperation } from '../types/index.js'
import { bytesToHex } from '@ethereumjs/util'

import { encodeUserOp } from '../utils/index.js'

export type PreVerificationGasCalculator = {
  /**
   * Calculate the gas cost of the pre-verification of the userOp.
   * The 'preVerificationGas' is the cost overhead that cannot be calculated precisely or accessed on-chain.
   * It is dependent on the blockchain parameters defined for all transactions.
   * The partial UserOperation is filled with necessary dummy data to estimate the gas cost.
   *
   * @param userOp - The UserOperation to calculate the gas cost for.
   * @returns the gas cost of the pre-verification of the userOp
   */
  estimatePreVerificationGas: (
    userOp: Partial<UserOperation>,
    gasOptions: GasOptions,
  ) => number

  validatePreVerificationGas: (
    userOp: UserOperation,
    gasOptions: GasOptions,
  ) => {
    isPreVerificationGasValid: boolean
    minRequiredPreVerificationGas: number
  }

  calculatePreVerificationGas: (
    userOp: UserOperation,
    gasOptions: GasOptions,
  ) => number

  updateGasConfig: (config: Partial<PreVerificationGasConfig>) => void
}

export type PreVerificationGasConfig = {
  /**
   * Cost of sending a basic transaction on the current chain.
   */
  readonly transactionGasStipend: number
  /**
   * Gas overhead is added to entire 'handleOp' bundle (on top of the transactionGasStipend).
   */
  readonly fixedGasOverhead: number
  /**
   * Gas overhead per UserOperation is added on top of the above fixed per-bundle.
   */
  readonly perUserOpGasOverhead: number

  /**
   * Gas overhead per single "word" (32 bytes) in callData.
   * (all validation fields are covered by verification gas checks)
   */
  readonly perUserOpWordGasOverhead: number
  /**
   * extra per-userop overhead, if callData starts with "executeUserOp" method signature.
   */
  readonly executeUserOpGasOverhead: number
  /**
   * extra per-word overhead, if callData starts with "executeUserOp" method signature.
   */
  readonly executeUserOpPerWordGasOverhead: number
  /**
   * The gas cost of a single "token" (zero byte) of the ABI-encoded UserOperation.
   */
  readonly standardTokenGasCost: number

  /**
   * should we enable EIP-7623 gas-based calculation.
   */
  readonly useEip7623: boolean

  /**
   * The EIP-7623 floor gas cost of a single token.
   */
  readonly floorPerTokenGasCost: number

  /**
   * The number of non-zero bytes that are counted as a single token (EIP-7623).
   */
  readonly tokensPerNonzeroByte: number

  /**
   * gas cost of EIP-7702 authorization. PER_EMPTY_ACCOUNT_COST
   * (this amount is taken even if the account is already deployed)
   */
  readonly eip7702AuthGas: number
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

export const MAINNET_CONFIG: PreVerificationGasConfig = {
  transactionGasStipend: 21000,
  fixedGasOverhead: 9830,
  perUserOpGasOverhead: 7260,
  executeUserOpGasOverhead: 1610,
  perUserOpWordGasOverhead: 9.5,
  executeUserOpPerWordGasOverhead: 8.2,
  standardTokenGasCost: 4,
  useEip7623: true,
  floorPerTokenGasCost: 10,
  tokensPerNonzeroByte: 4,
  eip7702AuthGas: 25000,
  expectedBundleSize: 1,
  estimationSignatureSize: 65,
  estimationPaymasterDataSize: 0,
}

export type GasOptions = {
  /**
   * if set, assume this gas is actually used by verification of the UserOperation.
   * (as checked during UserOperation simulation)
   */
  verificationGasUsed?: number

  /**
   * if set, this is the gas used by the entire UserOperation - including verification and execution.
   * that is, ignore verificationGas and also the 10% penalty on execution gas.
   * This value is only used for testing purposes.
   * It can only be used reliably from a transaction receipt, after the transaction was executed.
   * Note that setting zero value here disables EIP-7623 gas calculation (it overrides taking both verificationGas and callGasLimit into account).
   */
  totalGasUsed?: number
}

/**
 * Creates an instance of the PreVerificationGasCalculator module.
 *
 * @param chainId - The chain ID to create the PreVerificationGasCalculator for.
 * @returns An instance of the PreVerificationGasCalculator module.
 */
export const createPreVerificationGasCalculator = (
  chainId: number,
): PreVerificationGasCalculator => {
  const EXECUTE_USEROP_METHOD_SIG = '0x8dd7712f'
  const CHAIN_CONFIG: Record<number, PreVerificationGasConfig> = {
    1: MAINNET_CONFIG,
    1337: MAINNET_CONFIG,
    31337: MAINNET_CONFIG,
    11155111: MAINNET_CONFIG,
  }
  let gasConfig = CHAIN_CONFIG[chainId]
  if (!gasConfig) {
    throw new Error(`Unsupported chainId: ${chainId}`)
  }

  function countTokens(bytes: BytesLike): number {
    return ethers
      .getBytes(bytes)
      .map((x) => (x === 0 ? 1 : gasConfig.tokensPerNonzeroByte))
      .reduce((sum, x) => sum + x)
  }

  function getUserOpGasUsed(
    userOp: UserOperation,
    gasOptions: GasOptions,
  ): number {
    if (gasOptions?.totalGasUsed != null) {
      return gasOptions.totalGasUsed
    }

    const callGasLimit = BigInt(userOp.callGasLimit ?? 0)
    const postOpGasLimit = BigInt(userOp.paymasterPostOpGasLimit ?? 0)
    const verificationGasUsed = BigInt(gasOptions?.verificationGasUsed ?? 0)

    const result = (callGasLimit + postOpGasLimit) / 10n + verificationGasUsed

    // Safety check to avoid unsafe conversion
    if (result > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(
        `Calculated gas exceeds Number.MAX_SAFE_INTEGER: ${result.toString()}`,
      )
    }

    return Number(result)
  }

  // Based on the formula in https://eips.ethereum.org/EIPS/eip-7623#specification
  function eip7623transactionGasCost(
    stipendGasCost: number,
    tokenGasCount: number,
    executionGasCost: number,
  ): number {
    return Math.round(
      stipendGasCost +
        Math.max(
          gasConfig.standardTokenGasCost * tokenGasCount + executionGasCost,
          gasConfig.floorPerTokenGasCost * tokenGasCount,
        ),
    )
  }

  function fillUserOpWithDummyData(
    userOp: Partial<UserOperation>,
    gasConfig: PreVerificationGasConfig,
  ): UserOperation {
    const filledUserOp: UserOperation = Object.assign(
      {},
      userOp,
    ) as UserOperation
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

  function calculate(userOp: UserOperation, gasOptions: GasOptions): number {
    const packedUserOp = ethers.getBytes(encodeUserOp(userOp, false))
    const userOpWordsLength = (packedUserOp.length + 31) / 32
    const tokenCount = countTokens(packedUserOp)

    let callDataOverhead = 0
    let perUserOpOverhead = gasConfig.perUserOpGasOverhead
    if (userOp.eip7702Auth != null) {
      perUserOpOverhead += gasConfig.eip7702AuthGas
    }

    if (
      bytesToHex(ethers.getBytes(userOp.callData)).startsWith(
        EXECUTE_USEROP_METHOD_SIG,
      )
    ) {
      perUserOpOverhead +=
        gasConfig.executeUserOpGasOverhead +
        gasConfig.executeUserOpPerWordGasOverhead * userOpWordsLength
    } else {
      callDataOverhead +=
        Math.ceil(dataLength(userOp.callData) / 32) *
        gasConfig.perUserOpWordGasOverhead
    }

    const userOpSpecificOverhead = perUserOpOverhead + callDataOverhead
    const userOpShareOfBundleCost =
      gasConfig.fixedGasOverhead / gasConfig.expectedBundleSize

    const userOpShareOfStipend =
      gasConfig.transactionGasStipend / gasConfig.expectedBundleSize

    if (gasConfig.useEip7623) {
      const calculatedGasUsed = getUserOpGasUsed(userOp, gasOptions)

      const preVerficationGas =
        eip7623transactionGasCost(
          userOpShareOfStipend,
          tokenCount,
          userOpShareOfBundleCost + userOpSpecificOverhead + calculatedGasUsed,
        ) - calculatedGasUsed

      return preVerficationGas
    } else {
      // Not using EIP-7623
      return (
        gasConfig.standardTokenGasCost * tokenCount +
        userOpShareOfStipend +
        userOpShareOfBundleCost +
        userOpSpecificOverhead
      )
    }
  }

  return {
    updateGasConfig: (config: Partial<PreVerificationGasConfig>): void => {
      gasConfig = Object.assign({}, gasConfig, config)
    },
    estimatePreVerificationGas: (
      userOp: Partial<UserOperation>,
      gasOptions: GasOptions,
    ): number => {
      const filledUserOp = fillUserOpWithDummyData(userOp, gasConfig)
      return calculate(filledUserOp, gasOptions)
    },
    calculatePreVerificationGas: (
      userOp: UserOperation,
      gasOptions: GasOptions,
    ): number => {
      return calculate(userOp, gasOptions)
    },
    validatePreVerificationGas: (
      userOp: UserOperation,
      gasOptions: GasOptions,
    ): {
      isPreVerificationGasValid: boolean
      minRequiredPreVerificationGas: number
    } => {
      const minRequiredPreVerificationGas = calculate(userOp, gasOptions)
      return {
        minRequiredPreVerificationGas,
        isPreVerificationGasValid:
          minRequiredPreVerificationGas <=
          Number(BigInt(userOp.preVerificationGas)),
      }
    },
  }
}
