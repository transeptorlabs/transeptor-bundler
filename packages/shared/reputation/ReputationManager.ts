import { BigNumber, ethers } from 'ethers'

import { Logger } from '../logger/index.js'
import {
  ReputationEntry,
  ReputationParams,
  ReputationStatus,
} from '../types/index.js'
import { StakeInfo, ValidationErrors } from '../validatation/index.js'
import { requireCond, tostr } from '../utils/index.js'

export class ReputationManager {
  private entries: { [address: string]: ReputationEntry } = {}
  private readonly blackList = new Set<string>() // black-listed entities - always banned
  private readonly whitelist = new Set<string>() // white-listed entities - always OK.
  private interval: NodeJS.Timer | null = null
  private readonly minStake: BigNumber
  private readonly minUnstakeDelay: number
  private readonly stakeManagerContract: ethers.Contract

  private bundlerReputationParams: ReputationParams = {
    minInclusionDenominator: 10,
    throttlingSlack: 10,
    banSlack: 50,
  }

  private nonBundlerReputationParams: ReputationParams = {
    minInclusionDenominator: 100,
    throttlingSlack: 10,
    banSlack: 10,
  }

  constructor(
    minStake: BigNumber,
    minUnstakeDelay: number,
    stakeManagerContract: ethers.Contract,
  ) {
    this.minStake = minStake
    this.minUnstakeDelay = minUnstakeDelay
    this.stakeManagerContract = stakeManagerContract
  }

  public clearState(): void {
    this.entries = {}
  }

  // https://github.com/eth-infinitism/account-abstraction/blob/develop/eip/EIPS/eip-4337.md#reputation-scoring-and-throttlingbanning-for-paymasters
  public getStatus(addr?: string): ReputationStatus {
    addr = addr?.toLowerCase()
    if (addr == null || this.whitelist.has(addr)) {
      return ReputationStatus.OK
    }
    if (this.blackList.has(addr)) {
      return ReputationStatus.BANNED
    }

    const entry = this.entries[addr]
    if (entry == null) {
      return ReputationStatus.OK
    }
    const minExpectedIncluded = Math.floor(
      entry.opsSeen / this.bundlerReputationParams.minInclusionDenominator,
    )
    if (
      minExpectedIncluded <=
      entry.opsIncluded + this.bundlerReputationParams.throttlingSlack
    ) {
      return ReputationStatus.OK
    } else if (
      minExpectedIncluded <=
      entry.opsIncluded + this.bundlerReputationParams.banSlack
    ) {
      return ReputationStatus.THROTTLED
    } else {
      return ReputationStatus.BANNED
    }
  }

  /**
   * Returns the reputation status for all entries in reputation manager.
   *
   * @returns An array of reputation entries with their status.
   */
  dump(): ReputationEntry[] {
    Object.values(this.entries).forEach((entry) => {
      entry.status = this.getStatus(entry.address)
    })
    return Object.values(this.entries)
  }

  /**
   * Applies exponential backoff to the `opsSeen` and `opsIncluded` values
   * for each entry in the `entries` object and removes entries with zero values.
   *
   * This function is typically run on an hourly basis (as implied by its name).
   * It gradually reduces the `opsSeen` and `opsIncluded` values for each entry,
   * simulating a decay or cooldown effect over time. Entries are removed if
   * both `opsSeen` and `opsIncluded` are reduced to zero.
   *
   */
  private hourlyCron(): void {
    if (this.entries === undefined || this.entries === null) {
      return
    }

    Object.keys(this.entries).forEach((addr) => {
      const entry = this.entries[addr]
      entry.opsSeen = Math.floor((entry.opsSeen * 23) / 24)
      entry.opsIncluded = Math.floor((entry.opsSeen * 23) / 24)
      if (entry.opsIncluded === 0 && entry.opsSeen === 0) {
        delete this.entries[addr]
      }
    })
  }

  public startHourlyCron() {
    this.stopHourlyCron()

    Logger.info(
      `Set reputation interval to execute every ${60 * 60 * 1000} (ms)`,
    )

    this.interval = setInterval(this.hourlyCron, 60 * 60 * 1000) // 60 minutes * 60 seconds * 1000 milliseconds
  }

  public stopHourlyCron() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
      Logger.info('Stopping reputation interval')
    }
  }

  public addWhitelist(params: string[]): void {
    if (params.length === 0) {
      return
    }
    params.forEach((item) => this.whitelist.add(item))
  }

  public addBlacklist(params: string[]): void {
    if (params.length === 0) {
      return
    }
    params.forEach((item) => this.blackList.add(item))
  }

  private getOrCreate(addr: string): ReputationEntry {
    addr = addr.toLowerCase()
    let entry = this.entries[addr]
    if (entry == null) {
      this.entries[addr] = entry = {
        address: addr,
        opsSeen: 0,
        opsIncluded: 0,
      }
    }
    return entry
  }

  /**
   * Update the last seen status of an entity.
   *
   * @param addr - The address of the entity that is seen.
   */
  public updateSeenStatus(addr: string): void {
    const entry = this.getOrCreate(addr)
    entry.opsSeen++
  }

  /**
   * Update the included status of an entity.
   *
   * @param addr - The address of the entity that is included.
   */
  public updateIncludedStatus(addr: string): void {
    const entry = this.getOrCreate(addr)
    entry.opsIncluded++
  }

  public isWhitelisted(addr: string): boolean {
    return this.whitelist.has(addr)
  }

  public async getStakeStatus(address: string): Promise<{
    stakeInfo: StakeInfo
    isStaked: boolean
  }> {
    const info = await this.stakeManagerContract.getDepositInfo(address)
    const isStaked =
      BigNumber.from(info.stake).gte(this.minStake) &&
      BigNumber.from(info.unstakeDelaySec).gte(this.minUnstakeDelay)
    return {
      stakeInfo: {
        addr: address,
        stake: info.stake.toString(),
        unstakeDelaySec: info.unstakeDelaySec.toString(),
      },
      isStaked,
    }
  }

  /**
   * An entity that caused handleOps to revert, which requires re-building the bundle from scratch.
   * should be banned immediately, by increasing its opSeen counter
   *
   * @param addr - The address of the entity that caused the handleOps to revert.
   */
  public crashedHandleOps(addr: string): void {
    // TODO: what value to put? how long do we want this banning to hold?
    const entry = this.getOrCreate(addr)
    entry.opsSeen += 10000
    entry.opsIncluded = 0
    Logger.debug({ addr, entry }, 'crashedHandleOps')
  }

  /**
   * Set the reputation of the given entities. Intended for debug testing purposes.
   *
   * @param reputations - The reputation entries to set.
   * @returns The updated reputation entries.
   */
  public setReputation(reputations: ReputationEntry[]): ReputationEntry[] {
    reputations.forEach((rep) => {
      this.entries[rep.address.toLowerCase()] = {
        address: rep.address,
        opsSeen: rep.opsSeen,
        opsIncluded: rep.opsIncluded,
      }
    })
    return this.dump()
  }

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
  ): void {
    requireCond(
      this.getStatus(info.addr) !== ReputationStatus.BANNED,
      `${title} ${info.addr} is banned`,
      ValidationErrors.Reputation,
      { [title]: info.addr },
    )
  }

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
  ): void {
    requireCond(
      this.getStatus(info.addr) !== ReputationStatus.THROTTLED,
      `${title} ${info.addr} is throttled`,
      ValidationErrors.Reputation,
      { [title]: info.addr },
    )
  }

  /**
   * Check the given address (account/paymaster/deployer/aggregator) is staked.
   *
   * @param title the address title (field name to put into the "data" element).
   * @param info stake info from verification. if not given, then read from entryPoint.
   */
  public checkStake(
    title: 'account' | 'paymaster' | 'aggregator' | 'deployer',
    info?: StakeInfo,
  ): void {
    if (info?.addr == null || this.isWhitelisted(info.addr)) {
      return
    }
    requireCond(
      this.getStatus(info.addr) !== ReputationStatus.BANNED,
      `${title} ${info.addr} is banned`,
      ValidationErrors.Reputation,
      { [title]: info.addr },
    )

    requireCond(
      BigNumber.from(info.stake).gte(this.minStake),
      `${title} ${info.addr} stake ${tostr(info.stake)} is too low (min=${tostr(
        this.minStake,
      )})`,
      ValidationErrors.InsufficientStake,
    )
    requireCond(
      BigNumber.from(info.unstakeDelaySec).gte(
        BigNumber.from(this.minUnstakeDelay),
      ),
      `${title} ${info.addr} unstake delay ${tostr(
        info.unstakeDelaySec,
      )} is too low (min=${this.minUnstakeDelay})`,
      ValidationErrors.InsufficientStake,
    )
  }

  /**
   * @param entity - the address of a non-sender unstaked entity.
   * @returns maxMempoolCount - the number of UserOperations this entity is allowed to have in the mempool.
   */
  public calculateMaxAllowedMempoolOpsUnstaked(entity: string): number {
    entity = entity.toLowerCase()
    const SAME_UNSTAKED_ENTITY_MEMPOOL_COUNT = 10
    const entry = this.entries[entity]
    if (entry == null) {
      return SAME_UNSTAKED_ENTITY_MEMPOOL_COUNT
    }

    const INCLUSION_RATE_FACTOR = 10
    let inclusionRate = entry.opsIncluded / entry.opsSeen
    if (entry.opsSeen === 0) {
      // prevent NaN of Infinity in tests
      inclusionRate = 0
    }

    return (
      SAME_UNSTAKED_ENTITY_MEMPOOL_COUNT +
      Math.floor(inclusionRate * INCLUSION_RATE_FACTOR) +
      Math.min(entry.opsIncluded, 10000)
    )
  }
}