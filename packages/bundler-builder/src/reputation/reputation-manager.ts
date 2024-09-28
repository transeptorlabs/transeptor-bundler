import { BigNumber, ethers } from 'ethers'

import { Logger } from '../../../shared/logger/index.js'
import {
  ReputationEntry,
  ReputationManager,
  ReputationParams,
  ReputationStatus,
} from './reputation.types.js'
import {
  StakeInfo,
  ValidationErrors,
} from '../../../shared/validatation/index.js'
import { requireCond, tostr } from '../../../shared/utils/index.js'
import {
  MempoolStateService,
  ReputationEntries,
  MempoolStateKey,
} from '../mempool/index.js'

export const createReputationManager = (
  mp: MempoolStateService,
  minStake: BigNumber,
  minUnstakeDelay: number,
  stakeManagerContract: ethers.Contract,
): ReputationManager => {
  let interval: NodeJS.Timer | null = null
  const bundlerReputationParams: ReputationParams = {
    minInclusionDenominator: 10,
    throttlingSlack: 10,
    banSlack: 50,
  }

  const stopHourlyCron = () => {
    if (interval) {
      clearInterval(interval)
      interval = null
      Logger.info('Stopping reputation interval')
    }
  }

  const startHourlyCron = async () => {
    stopHourlyCron()

    Logger.info(
      `Set reputation interval to execute every ${60 * 60 * 1000} (ms)`,
    )

    const { reputationEntries } = await mp.getState(
      MempoolStateKey.ReputationEntries,
    )

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
    interval = setInterval(
      () => {
        if (reputationEntries === undefined || reputationEntries === null) {
          return
        }

        Object.keys(reputationEntries).forEach(async (addr) => {
          const entry = reputationEntries[addr]

          await mp.updateState(
            MempoolStateKey.ReputationEntries,
            ({ reputationEntries }) => {
              if (entry.opsIncluded === 0 && entry.opsSeen === 0) {
                // delete the entry from the state
                const stateEntries = { ...reputationEntries }
                delete stateEntries[addr]
                return {
                  reputationEntries: stateEntries,
                }
              }

              return {
                reputationEntries: {
                  ...reputationEntries,
                  [addr]: {
                    address: entry.address,
                    opsSeen: Math.floor((entry.opsSeen * 23) / 24),
                    opsIncluded: Math.floor((entry.opsSeen * 23) / 24),
                  },
                },
              }
            },
          )
        })
      },
      60 * 60 * 1000,
    ) // 60 minutes * 60 seconds * 1000 milliseconds
  }

  // https://github.com/eth-infinitism/account-abstraction/blob/develop/eip/EIPS/eip-4337.md#reputation-scoring-and-throttlingbanning-for-paymasters
  const getStatus = async (addr?: string): Promise<ReputationStatus> => {
    const { whiteList, blackList, reputationEntries } = await mp.getState([
      MempoolStateKey.WhiteList,
      MempoolStateKey.BlackList,
      MempoolStateKey.ReputationEntries,
    ])

    addr = addr?.toLowerCase()

    if (addr == null || whiteList.indexOf(addr) !== -1) {
      return ReputationStatus.OK
    }
    if (blackList.indexOf(addr) !== -1) {
      return ReputationStatus.BANNED
    }

    const entry = reputationEntries[addr]
    if (entry == null) {
      return ReputationStatus.OK
    }
    const minExpectedIncluded = Math.floor(
      entry.opsSeen / bundlerReputationParams.minInclusionDenominator,
    )
    if (
      minExpectedIncluded <=
      entry.opsIncluded + bundlerReputationParams.throttlingSlack
    ) {
      return ReputationStatus.OK
    } else if (
      minExpectedIncluded <=
      entry.opsIncluded + bundlerReputationParams.banSlack
    ) {
      return ReputationStatus.THROTTLED
    } else {
      return ReputationStatus.BANNED
    }
  }

  const dump = async (): Promise<ReputationEntry[]> => {
    const { reputationEntries } = await mp.getState(
      MempoolStateKey.ReputationEntries,
    )
    return Object.values(reputationEntries)
  }

  return {
    getStatus,

    stopHourlyCron,

    startHourlyCron,

    dump,

    clearState: async () => {
      await mp.updateState(MempoolStateKey.ReputationEntries, (_) => {
        return {
          reputationEntries: {},
        }
      })
    },

    addWhitelist: async (items: string[]): Promise<void> => {
      if (items.length === 0) {
        return
      }
      await mp.updateState(MempoolStateKey.WhiteList, ({ whiteList }) => {
        return {
          whiteList: [...whiteList, ...items],
        }
      })
    },

    addBlacklist: async (items: string[]): Promise<void> => {
      if (items.length === 0) {
        return
      }
      await mp.updateState(MempoolStateKey.BlackList, ({ blackList }) => {
        return {
          blackList: [...blackList, ...items],
        }
      })
    },

    updateSeenStatus: async (addr: string): Promise<void> => {
      addr = addr.toLowerCase()

      await mp.updateState(
        MempoolStateKey.ReputationEntries,
        ({ reputationEntries }) => {
          const entry = reputationEntries[addr]
          return {
            reputationEntries: {
              ...reputationEntries,
              [addr]: {
                address: addr,
                opsSeen: entry ? entry.opsSeen + 1 : 0,
                opsIncluded: entry ? entry.opsIncluded : 0,
              },
            },
          }
        },
      )
    },

    updateIncludedStatus: async (addr: string): Promise<void> => {
      addr = addr.toLowerCase()
      await mp.updateState(
        MempoolStateKey.ReputationEntries,
        ({ reputationEntries }) => {
          const entry = reputationEntries[addr]
          return {
            reputationEntries: {
              ...reputationEntries,
              [addr]: {
                address: addr,
                opsSeen: entry ? entry.opsSeen : 0,
                opsIncluded: entry ? entry.opsIncluded + 1 : 0,
              },
            },
          }
        },
      )
    },

    getStakeStatus: async (
      address: string,
    ): Promise<{
      stakeInfo: StakeInfo
      isStaked: boolean
    }> => {
      const info = await stakeManagerContract.getDepositInfo(address)
      const isStaked =
        BigNumber.from(info.stake).gte(minStake) &&
        BigNumber.from(info.unstakeDelaySec).gte(minUnstakeDelay)
      return {
        stakeInfo: {
          addr: address,
          stake: info.stake.toString(),
          unstakeDelaySec: info.unstakeDelaySec.toString(),
        },
        isStaked,
      }
    },

    crashedHandleOps: async (addr: string): Promise<void> => {
      // TODO: what value to put? how long do we want this banning to hold?
      addr = addr.toLowerCase()

      await mp.updateState(
        MempoolStateKey.ReputationEntries,
        ({ reputationEntries }) => {
          const entry = reputationEntries[addr]
          const bannedEntry = {
            address: addr,
            opsSeen: entry ? entry.opsSeen + 10000 : 10000,
            opsIncluded: 0,
          }
          Logger.debug({ addr, entry: bannedEntry }, 'crashedHandleOps')
          return {
            reputationEntries: {
              ...reputationEntries,
              [addr]: bannedEntry,
            },
          }
        },
      )
    },

    setReputation: async (
      reputations: ReputationEntry[],
    ): Promise<ReputationEntry[]> => {
      if (reputations.length === 0) {
        return dump()
      }

      const initalReady: ReputationEntries = {}
      const newEntries = reputations.reduce((acc, rep) => {
        const addr = rep.address.toLowerCase()
        acc[addr] = {
          address: addr,
          opsSeen: rep.opsSeen,
          opsIncluded: rep.opsIncluded,
        }
        return acc
      }, initalReady)

      await mp.updateState(
        MempoolStateKey.ReputationEntries,
        ({ reputationEntries }) => {
          return {
            reputationEntries: {
              ...reputationEntries,
              ...newEntries,
            },
          }
        },
      )

      return dump()
    },

    checkBanned: async (
      title: 'account' | 'paymaster' | 'aggregator' | 'deployer',
      info: StakeInfo,
    ): Promise<void> => {
      const status = await getStatus(info.addr)
      requireCond(
        status !== ReputationStatus.BANNED,
        `${title} ${info.addr} is banned`,
        ValidationErrors.Reputation,
        { [title]: info.addr },
      )
    },

    checkThrottled: async (
      title: 'account' | 'paymaster' | 'aggregator' | 'deployer',
      info: StakeInfo,
    ): Promise<void> => {
      const status = await getStatus(info.addr)
      requireCond(
        status !== ReputationStatus.THROTTLED,
        `${title} ${info.addr} is throttled`,
        ValidationErrors.Reputation,
        { [title]: info.addr },
      )
    },

    checkStake: async (
      title: 'account' | 'paymaster' | 'aggregator' | 'deployer',
      info?: StakeInfo,
    ): Promise<void> => {
      // If the address is whitelisted, we don't need to check the stake
      const status = await getStatus(info.addr)
      if (info?.addr == null || status === ReputationStatus.OK) {
        return
      }

      requireCond(
        status !== ReputationStatus.BANNED,
        `${title} ${info.addr} is banned`,
        ValidationErrors.Reputation,
        { [title]: info.addr },
      )

      requireCond(
        BigNumber.from(info.stake).gte(minStake),
        `${title} ${info.addr} stake ${tostr(info.stake)} is too low (min=${tostr(
          minStake,
        )})`,
        ValidationErrors.InsufficientStake,
      )
      requireCond(
        BigNumber.from(info.unstakeDelaySec).gte(
          BigNumber.from(minUnstakeDelay),
        ),
        `${title} ${info.addr} unstake delay ${tostr(
          info.unstakeDelaySec,
        )} is too low (min=${minUnstakeDelay})`,
        ValidationErrors.InsufficientStake,
      )
    },

    calculateMaxAllowedMempoolOpsUnstaked: async (
      entity: string,
    ): Promise<number> => {
      const { reputationEntries } = await mp.getState(
        MempoolStateKey.ReputationEntries,
      )
      entity = entity.toLowerCase()
      const SAME_UNSTAKED_ENTITY_MEMPOOL_COUNT = 10
      const entry = reputationEntries[entity]
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
    },
  }
}
