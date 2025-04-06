import { ContractFactory, ErrorDescription, ethers, Wallet } from 'ethers'
import {
  GET_USEROP_HASHES_ABI,
  GET_USEROP_HASHES_BYTECODE,
} from 'src/abis/helper.abi.js'
import { Logger } from 'src/logger/base-logger.js'
import { ProviderService } from 'src/provider/index.js'
import { ReputationManagerReader, UserOperation } from 'src/types/index.js'
import { packUserOps } from 'src/utils/bundle.utils.js'

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
    Logger.debug(
      `low balance. using, ${beneficiaryToUse}, as beneficiary instead of , ${beneficiary}`,
    )
  }
  return beneficiaryToUse
}

/**
 * Check if an error is fatal. Fatal errors we know we can't recover
 *
 * @param e - The error.
 */
export const checkFatal = (e: any): void => {
  if (e.error?.code === -32601) {
    throw e
  }
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
    Logger.warn(
      { e },
      'Failed to get userOpHashes, but bundle was sent successfully',
    )
    return []
  }
}

/**
 * Find the entity to ban.
 *
 * @param reasonStr - The reason string.
 * @param userOp - The user operation.
 * @param reputationManager - The reputation manager.
 * @param entryPointAddress - The entry point address.
 * @returns The entity to ban.
 */
export const findEntityToBan = async (
  reasonStr: string,
  userOp: UserOperation,
  reputationManager: ReputationManagerReader,
  entryPointAddress: string,
): Promise<string | undefined> => {
  const isAccountStaked = async (): Promise<boolean> => {
    const senderStakeInfo = await reputationManager.getStakeStatus(
      userOp.sender,
      entryPointAddress,
    )
    return senderStakeInfo?.isStaked
  }
  const isFactoryStaked = async (): Promise<boolean> => {
    const factoryStakeInfo =
      userOp.factory == null
        ? null
        : await reputationManager.getStakeStatus(
            userOp.factory,
            entryPointAddress,
          )
    return factoryStakeInfo?.isStaked ?? false
  }

  if (reasonStr.startsWith('AA3')) {
    // [EREP-030]  A Staked Account is accountable for failures in other entities (`paymaster`, `aggregator`) even if they are staked.
    return (await isAccountStaked()) ? userOp.sender : userOp.paymaster
  } else if (reasonStr.startsWith('AA2')) {
    // [EREP-020] A staked factory is "accountable" for account breaking the rules.
    return (await isFactoryStaked()) ? userOp.factory : userOp.sender
  } else if (reasonStr.startsWith('AA1')) {
    // (can't have staked account during its creation)
    return userOp.factory
  }
  return undefined
}

/**
 * Parse an error.
 *
 * @param e - The error.
 * @param entryPoint - The entry point.
 * @returns The error description.
 */
export const parseError = (
  e: any,
  entryPoint: ethers.Contract,
): ErrorDescription | undefined => {
  try {
    let data = e.data?.data ?? e.data
    const body = e?.error?.error?.body
    if (body != null) {
      const jsonbody = JSON.parse(body)
      data = jsonbody.error.data?.data ?? jsonbody.error.data
    }

    return entryPoint.interface.parseError(data)
  } catch (e1) {
    checkFatal(e)
    Logger.warn(
      { e, e1 },
      'Failed handleOps(could not parse error), but non-FailedOp error',
    )
    return undefined
  }
}
