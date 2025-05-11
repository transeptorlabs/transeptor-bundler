import { ReputationManagerReader, UserOperation } from '../types/index.js'

/**
 * Find the entity to blame.
 *
 * @param reasonStr - The reason string.
 * @param userOp - The user operation.
 * @param reputationManager - The reputation manager.
 * @param entryPointAddress - The entry point address.
 * @returns The entity to ban.
 */
export const findEntityToBlame = async (
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
    // [EREP-015]: paymaster is not blamed for account/factory failure
    return (await isFactoryStaked()) ? userOp.factory : userOp.sender
  } else if (reasonStr.startsWith('AA1')) {
    // [EREP-015]: paymaster is not blamed for account/factory failure
    // (can't have staked account during its creation)
    return userOp.factory
  }
  return undefined
}
