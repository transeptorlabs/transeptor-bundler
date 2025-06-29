import { ContractFactory, ethers, Wallet } from 'ethers'

import {
  GET_USEROP_HASHES_ABI,
  GET_USEROP_HASHES_BYTECODE,
} from '../../abis/helper.abi.js'
import { ProviderService } from '../../provider/index.js'
import { UserOperation } from '../../types/index.js'
import { packUserOps } from '../../utils/index.js'

/**
 * Determine who should receive the proceedings of the request.
 * if signer balance is too low, send it to signer. otherwise, send to configured beneficiary.
 *
 * @param signer - the signer to check balance.
 * @param providerService - the provider service to get the balance.
 * @param beneficiary - the beneficiary to send the balance to.
 * @param minSignerBalance - the minimum balance to send the balance to the signer.
 * @returns the address of the beneficiary.
 */
export const selectBeneficiary = async (
  signer: Wallet,
  providerService: ProviderService,
  beneficiary: string,
  minSignerBalance: bigint,
): Promise<string> => {
  const currentBalance = await providerService.getBalance(signer.address)
  let beneficiaryToUse = beneficiary
  // below min-balance redeem to the signer, to keep it active.
  if (currentBalance <= minSignerBalance) {
    beneficiaryToUse = await signer.getAddress()
  }
  return beneficiaryToUse
}

/**
 * Get the user operation hashes.
 *
 * @param userOps - The user operations.
 * @param providerService - The provider service.
 * @param entryPointAddress - The entry point address.
 * @returns The user operation hashes.
 */
export const getUserOpHashes = async (
  userOps: UserOperation[],
  providerService: ProviderService,
  entryPointAddress: string,
): Promise<string[]> => {
  try {
    const getUserOpCodeHashesFactory = new ethers.ContractFactory(
      GET_USEROP_HASHES_ABI,
      GET_USEROP_HASHES_BYTECODE,
    ) as ContractFactory

    const { userOpHashes } = await providerService.runContractScript(
      getUserOpCodeHashesFactory,
      [entryPointAddress, packUserOps(userOps)],
    )

    return userOpHashes
  } catch (e) {
    return []
  }
}
