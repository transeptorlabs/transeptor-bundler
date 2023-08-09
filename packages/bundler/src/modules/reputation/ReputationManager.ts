import { BigNumber } from 'ethers'
import { ReputationEntry, ReputationParams, ReputationStatus, StakeInfo, ValidationErrors } from '../types'
import { requireCond, tostr } from '../utils'
import { Logger } from '../logger'

export class ReputationManager {
  private entries: { [address: string]: ReputationEntry } = {}
  private readonly blackList = new Set<string>() // black-listed entities - always banned
  private readonly whitelist = new Set<string>() // white-listed entities - always OK.
  private interval: any| null = null
  private readonly minStake: BigNumber
  private readonly minUnstakeDelay: number

  private bundlerReputationParams: ReputationParams = {
    minInclusionDenominator: 10,
    throttlingSlack: 10,
    banSlack: 10
  }

  private nonBundlerReputationParams: ReputationParams = {
    minInclusionDenominator: 100,
    throttlingSlack: 10,
    banSlack: 10
  }

  constructor(minStake: BigNumber, minUnstakeDelay: number) {
    this.minStake = minStake
    this.minUnstakeDelay = minUnstakeDelay

    this.startHourlyCron()
  }

  /**
   * debug: dump reputation map (with updated "status" for each entry)
   */
  dump (): ReputationEntry[] {
    return Object.values(this.entries)
  }

  /**
   * exponential backoff of opsSeen and opsIncluded values
   */
  private hourlyCron (): void {
    if(this.entries === undefined || this.entries === null) {
      return
    }

    Object.keys(this.entries).forEach(addr => {
      const entry = this.entries[addr]
      entry.opsSeen = Math.floor(entry.opsSeen * 23 / 24)
      entry.opsIncluded = Math.floor(entry.opsSeen * 23 / 24)
      if (entry.opsIncluded === 0 && entry.opsSeen === 0) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete this.entries[addr]
      }
    })
  }

  public startHourlyCron() {
    this.stopHourlyCron()
    
    Logger.info(`Set reputation interval to execute every ${60 * 60 * 1000} (ms)`)

    this.interval = setInterval(this.hourlyCron, 60 * 60 * 1000) // 60 minutes * 60 seconds * 1000 milliseconds
  }

  public stopHourlyCron() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
      Logger.info('Stopping reputation interval')
    }
  }

  public addWhitelist (params: string[]): void {
    if (params.length === 0) {
      return
    }
    params.forEach(item => this.whitelist.add(item))
  }

  public addBlacklist (params: string[]): void {
    if (params.length === 0) {
      return
    }
    params.forEach(item => this.blackList.add(item))
  }

  private getOrCreate (addr: string): ReputationEntry {
    let entry = this.entries[addr]
    if (entry == null) {
      this.entries[addr] = entry = {
        address: addr,
        opsSeen: 0,
        opsIncluded: 0
      }
    }
    return entry
  }

  /**
   * address seen in the mempool triggered by the
   * @param addr
   */
  public updateSeenStatus (addr?: string): void {
    if (addr == null) {
      return
    }
    const entry = this.getOrCreate(addr)
    entry.opsSeen++
    Logger.debug({addr, entry}, 'after seen++')
  }

  /**
   * found paymaster/deployer/aggregator on-chain.
   * triggered by the EventsManager.
   * @param addr
   */
  public updateIncludedStatus (addr: string): void {
    const entry = this.getOrCreate(addr)
    entry.opsIncluded++
    Logger.debug({addr, entry}, 'after Included++')
  }

  public isWhitelisted (addr: string): boolean {
    return this.whitelist.has(addr)
  }

  // https://github.com/eth-infinitism/account-abstraction/blob/develop/eip/EIPS/eip-4337.md#reputation-scoring-and-throttlingbanning-for-paymasters
  public getStatus (addr?: string): ReputationStatus {
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
    const minExpectedIncluded = Math.floor(entry.opsSeen / this.bundlerReputationParams.minInclusionDenominator)
    if (minExpectedIncluded <= entry.opsIncluded + this.bundlerReputationParams.throttlingSlack) {
      return ReputationStatus.OK
    } else if (minExpectedIncluded <= entry.opsIncluded + this.bundlerReputationParams.banSlack) {
      return ReputationStatus.THROTTLED
    } else {
      return ReputationStatus.BANNED
    }
  }

  /**
   * an entity that caused handleOps to revert, which requires re-building the bundle from scratch.
   * should be banned immediately, by increasing its opSeen counter
   * @param addr
   */
  public crashedHandleOps (addr: string | undefined): void {
    if (addr == null) {
      return
    }
    // todo: what value to put? how long do we want this banning to hold?
    const entry = this.getOrCreate(addr)
    entry.opsSeen = 100
    entry.opsIncluded = 0
    Logger.debug({addr, entry}, 'crashedHandleOps')
  }

  /**
   * for debugging: clear in-memory state
   */
  public clearState (): void {
    this.entries = {}
  }

  /**
   * for debugging: put in the given reputation entries
   * @param entries
   */
  public setReputation (reputations: ReputationEntry[]):  ReputationEntry[] {
    reputations.forEach(rep => {
      this.entries[rep.address] = {
        address: rep.address,
        opsSeen: rep.opsSeen,
        opsIncluded: rep.opsIncluded
      }
    })
    return this.dump()
  }

  /**
   * check the given address (account/paymaster/deployer/aggregator) is staked
   * @param title the address title (field name to put into the "data" element)
   * @param raddr the address to check the stake of. null is "ok"
   * @param info stake info from verification. if not given, then read from entryPoint
   */
  public checkStake (title: 'account' | 'paymaster' | 'aggregator' | 'deployer', info?: StakeInfo): void {
    if (info?.addr == null || this.isWhitelisted(info.addr)) {
      return
    }
    requireCond(this.getStatus(info.addr) !== ReputationStatus.BANNED,
      `${title} ${info.addr} is banned`,
      ValidationErrors.Reputation, { [title]: info.addr })

    requireCond(BigNumber.from(info.stake).gte(this.minStake),
      `${title} ${info.addr} stake ${tostr(info.stake)} is too low (min=${tostr(this.minStake)})`,
      ValidationErrors.InsufficientStake)
    requireCond(BigNumber.from(info.unstakeDelaySec).gte(BigNumber.from(this.minUnstakeDelay)),
      `${title} ${info.addr} unstake delay ${tostr(info.unstakeDelaySec)} is too low (min=${this.minUnstakeDelay})`,
      ValidationErrors.InsufficientStake)
  }
}