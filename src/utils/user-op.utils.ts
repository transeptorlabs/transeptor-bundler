import { UserOperation } from '../types/index.js'

/**
 * calculate the maximum cost of a UserOperation where
 * the cost is the sum of the verification gas limits and call gas limit, multiplied by the maxFeePerGas.
 *
 * @param userOp - The UserOperation to calculate the maximum cost for.
 * @returns The maximum cost of the UserOperation.
 */
export const getUserOpMaxCost = (userOp: UserOperation): bigint => {
  const { preVerificationGas } = userOp
  const sumGasValues = [
    preVerificationGas ?? BigInt(0),
    userOp.verificationGasLimit,
    userOp.callGasLimit,
    userOp.paymasterVerificationGasLimit ?? BigInt(0),
    userOp.paymasterPostOpGasLimit ?? BigInt(0),
  ].reduce((acc: bigint, current) => acc + BigInt(current), BigInt(0))

  return sumGasValues * BigInt(userOp.maxFeePerGas)
}
