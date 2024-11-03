import { BigNumber } from 'ethers'
import { UserOperation } from '../types/index.js'

/**
 * calculate the maximum cost of a UserOperation where
 * the cost is the sum of the verification gas limits and call gas limit, multiplied by the maxFeePerGas.
 *
 * @param userOp - The UserOperation to calculate the maximum cost for.
 * @returns The maximum cost of the UserOperation.
 */
export const getUserOpMaxCost = (userOp: UserOperation): BigNumber => {
  const { preVerificationGas } = userOp
  const sumGasValues = [
    preVerificationGas ?? 0,
    userOp.verificationGasLimit,
    userOp.callGasLimit,
    userOp.paymasterVerificationGasLimit ?? 0,
    userOp.paymasterPostOpGasLimit ?? 0,
  ].reduce((acc: BigNumber, current) => acc.add(current), BigNumber.from(0))

  return sumGasValues.mul(userOp.maxFeePerGas)
}
