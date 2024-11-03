import { StakeInfo } from '../validatation/index.js'

/**
 * Throttled entities are allowed minimal number of entries per bundle. Banned entities are allowed none.
 */
export enum ReputationStatus {
  OK,
  THROTTLED,
  BANNED,
}

export type ReputationParams = {
  minInclusionDenominator: number
  throttlingSlack: number
  banSlack: number
}

export type ReputationEntry = {
  address: string
  opsSeen: number
  opsIncluded: number
  status?: ReputationStatus
}

export type ReputationManager = {
  startHourlyCron(): Promise<void>
  stopHourlyCron(): void
  clearState(): Promise<void>
  getStatus(addr?: string): Promise<ReputationStatus>

  /**
   * Returns the reputation status for all entries in reputation manager.
   *
   * @returns An array of reputation entries with their status.
   */
  dump(): Promise<ReputationEntry[]>

  addWhitelist(items: string[]): Promise<void>
  addBlacklist(items: string[]): Promise<void>

  /**
   * Update the last seen status of an entity.
   *
   * @param addr - The address of the entity that is seen.
   * @param action - The action to perform (increment or decrement).
   */
  updateSeenStatus(
    addr: string | undefined,
    action: 'increment' | 'decrement',
  ): Promise<void>

  /**
   * Update the last seen status of an entity.
   *
   * @param addrs - The addresses of the entities that are seen.
   */
  updateSeenStatusBatch(addrs: string[]): Promise<void>

  /**
   * Update the included status of an entity.
   *
   * @param addr - The address of the entity that is included.
   */
  updateIncludedStatus(addr: string): Promise<void>

  getStakeStatus(
    address: string,
    entryPointAddress: string,
  ): Promise<{
    stakeInfo: StakeInfo
    isStaked: boolean
  }>

  /**
   * An entity that caused handleOps to revert, which requires re-building the bundle from scratch.
   * should be banned immediately, by increasing its opSeen counter
   *
   * @param addr - The address of the entity that caused the handleOps to revert.
   */
  crashedHandleOps(addr: string): Promise<void>

  /**
   * Set the reputation of the given entities. Intended for debug testing purposes.
   *
   * @param reputations - The reputation entries to set.
   * @returns The updated reputation entries.
   */
  setReputation(reputations: ReputationEntry[]): Promise<ReputationEntry[]>

  /**
   * Check the given address (account/paymaster/deployer/aggregator) is banned.
   * Does not check whitelist or stake
   *
   * @param title the address title (field name to put into the "data" element)
   * @param info stake info for the address.
   */
  checkBanned(
    title: 'account' | 'paymaster' | 'aggregator' | 'deployer',
    info: StakeInfo,
  ): Promise<void>

  /**
   * check the given address (account/paymaster/deployer/aggregator) is throttled
   * Does not check whitelist or stake
   *
   * @param title the address title (field name to put into the "data" element)
   * @param info stake info for the address.
   */
  checkThrottled(
    title: 'account' | 'paymaster' | 'aggregator' | 'deployer',
    info: StakeInfo,
  ): Promise<void>

  /**
   * Check the given address (account/paymaster/deployer/aggregator) is staked.
   *
   * @param title the address title (field name to put into the "data" element).
   * @param info stake info from verification. if not given, then read from entryPoint.
   */
  checkStake(
    title: 'account' | 'paymaster' | 'aggregator' | 'deployer',
    info?: StakeInfo,
  ): Promise<void>

  /**
   * @param entity - the address of a non-sender unstaked entity.
   * @returns maxMempoolCount - the number of UserOperations this entity is allowed to have in the mempool.
   */
  calculateMaxAllowedMempoolOpsUnstaked(entity: string): Promise<number>
}

export type ReputationManagerUpdater = Pick<
  ReputationManager,
  'updateSeenStatus' | 'crashedHandleOps'
>

export type ReputationManagerReader = Pick<ReputationManager, 'getStakeStatus'>
