import { ethers } from 'ethers'
import { UserOperation } from '../types/index.js'
import { StateService, StateKey } from '../state/index.js'
import { getUserOpMaxCost, requireCond } from '../utils/index.js'
import { ValidationErrors } from '../validatation/index.js'

/**
 * The DepositManager is responsible for managing the deposits of paymasters. It ensures that each paymaster has enough deposit to cover the gas costs of the pending UserOperations in the mempool.
 *
 * [EREP-010] - For each paymaster, the mempool must maintain the total gas UserOperations using this paymaster may consume.
 * - Do not add a UserOperation to the mempool if the maximum total gas cost, including the new UserOperation, is above the deposit of the paymaster at the current gas price.
 */
export type DepositManager = {
  checkPaymasterDeposit(userOp: UserOperation): Promise<void>
}

export const createDepositManager = (
  state: StateService,
  entryPointContract: ethers.Contract,
): DepositManager => {
  return {
    checkPaymasterDeposit: async (userOp: UserOperation) => {
      const paymaster = userOp.paymaster
      if (
        paymaster == null ||
        paymaster === '0x' ||
        paymaster === ethers.ZeroAddress
      ) {
        return
      }

      let deposit = (await entryPointContract.balanceOf(paymaster)) as bigint
      deposit = deposit - getUserOpMaxCost(userOp)

      const { standardPool } = await state.getState(StateKey.StandardPool)
      Object.values(standardPool).forEach((entry) => {
        if (entry.userOp.paymaster === paymaster) {
          deposit = deposit - BigInt(getUserOpMaxCost(userOp))
        }
      })

      requireCond(
        deposit >= BigInt(0),
        'paymaster deposit too low for all mempool UserOps',
        ValidationErrors.PaymasterDepositTooLow,
      )
    },
  }
}
