import { ethers } from 'ethers'

import { Logger } from '../logger/index.js'
import {
  ReputationEntry,
  ReputationManager,
  ReputationParams,
  ReputationStatus,
  ReputationManagerUpdater,
  ReputationManagerReader,
} from './reputation.types.js'
import { StakeInfo, ValidationErrors } from '../validatation/index.js'
import { requireCond, tostr } from '../utils/index.js'
import { StateService, ReputationEntries, StateKey } from '../state/index.js'

export const createReputationManagerUpdater = (
  reputationManager: ReputationManager,
): ReputationManagerUpdater => {
  return {
    updateSeenStatus: reputationManager.updateSeenStatus,
    crashedHandleOps: reputationManager.crashedHandleOps,
  }
}

export const createReputationManagerReader = (
  reputationManager: ReputationManager,
): ReputationManagerReader => {
  return {
    getStakeStatus: reputationManager.getStakeStatus,
  }
}

export const createReputationManager = (
  state: StateService,
  minStake: bigint,
  minUnstakeDelay: bigint,
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

    const { reputationEntries } = await state.getState(
      StateKey.ReputationEntries,
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

          await state.updateState(
            StateKey.ReputationEntries,
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
    const { whiteList, blackList, reputationEntries } = await state.getState([
      StateKey.WhiteList,
      StateKey.BlackList,
      StateKey.ReputationEntries,
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
    const { reputationEntries } = await state.getState(
      StateKey.ReputationEntries,
    )

    const res = await Promise.all(
      Object.values(reputationEntries).map(async (entry) => {
        const status = await getStatus(entry.address)
        entry.status = status
        return entry
      }),
    )

    return res
  }

  return {
    getStatus,

    stopHourlyCron,

    startHourlyCron,

    dump,

    clearState: async () => {
      await state.updateState(StateKey.ReputationEntries, (_) => {
        return {
          reputationEntries: {},
        }
      })
    },

    addWhitelist: async (items: string[]): Promise<void> => {
      if (items.length === 0) {
        return
      }
      await state.updateState(StateKey.WhiteList, ({ whiteList }) => {
        return {
          whiteList: [...whiteList, ...items],
        }
      })
    },

    addBlacklist: async (items: string[]): Promise<void> => {
      if (items.length === 0) {
        return
      }
      await state.updateState(StateKey.BlackList, ({ blackList }) => {
        return {
          blackList: [...blackList, ...items],
        }
      })
    },

    updateSeenStatus: async (
      addr: string | undefined,
      action: 'increment' | 'decrement',
    ): Promise<void> => {
      if (!addr || addr == null) {
        return
      }

      Logger.debug({ addr }, 'Updating seen status with reputation manager')
      addr = addr.toLowerCase()
      await state.updateState(
        StateKey.ReputationEntries,
        ({ reputationEntries }) => {
          const entry = reputationEntries[addr]
          const opsSeenValue = action === 'increment' ? 1 : -1
          return {
            reputationEntries: {
              ...reputationEntries,
              [addr]: {
                address: addr,
                opsSeen: entry ? entry.opsSeen + opsSeenValue : 0,
                opsIncluded: entry ? entry.opsIncluded : 0,
              },
            },
          }
        },
      )
    },

    updateSeenStatusBatch: async (addrs: string[]): Promise<void> => {
      if (addrs.length === 0) {
        return
      }

      await state.updateState(
        StateKey.ReputationEntries,
        ({ reputationEntries }) => {
          const newEntries = addrs.reduce((acc, addr) => {
            addr = addr.toLowerCase()
            const entry = reputationEntries[addr]
            acc[addr] = {
              address: addr,
              opsSeen: entry ? entry.opsSeen + 1 : 0,
              opsIncluded: entry ? entry.opsIncluded : 0,
            }
            return acc
          }, {} as ReputationEntries)

          return {
            reputationEntries: {
              ...reputationEntries,
              ...newEntries,
            },
          }
        },
      )
    },

    updateIncludedStatus: async (addr: string): Promise<void> => {
      addr = addr.toLowerCase()
      await state.updateState(
        StateKey.ReputationEntries,
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
      _: string,
    ): Promise<{
      stakeInfo: StakeInfo
      isStaked: boolean
    }> => {
      const info = await stakeManagerContract.getDepositInfo(address)
      const isStaked =
        BigInt(info.stake) >= minStake &&
        BigInt(info.unstakeDelaySec) >= minUnstakeDelay

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
      if (addr == null) {
        return
      }

      addr = addr.toLowerCase()

      await state.updateState(
        StateKey.ReputationEntries,
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
      const initalReady: ReputationEntries = {}
      const newEntries = reputations.reduce((acc, rep) => {
        const addr = rep.address.toLowerCase()
        acc[addr] = {
          address: addr,
          opsSeen: Number(BigInt(rep.opsSeen)),
          opsIncluded: Number(BigInt(rep.opsIncluded)),
        }
        return acc
      }, initalReady)

      await state.updateState(
        StateKey.ReputationEntries,
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
      if (info?.addr == null) {
        return
      }

      // If the address is whitelisted, we don't need to check the stake
      const status = await getStatus(info.addr)
      requireCond(
        status !== ReputationStatus.BANNED,
        `${title} ${info.addr} is banned`,
        ValidationErrors.Reputation,
        { [title]: info.addr },
      )

      // Check if min stake and unstake delay are met
      requireCond(
        BigInt(info.stake) >= minStake,
        `${title} ${info.addr} stake ${tostr(info.stake)} is too low (min=${tostr(
          minStake,
        )})`,
        ValidationErrors.InsufficientStake,
      )

      requireCond(
        BigInt(info.unstakeDelaySec) >= minUnstakeDelay,
        `${title} ${info.addr} unstake delay ${tostr(
          info.unstakeDelaySec,
        )} is too low (min=${minUnstakeDelay})`,
        ValidationErrors.InsufficientStake,
      )
    },

    calculateMaxAllowedMempoolOpsUnstaked: async (
      entity: string,
    ): Promise<number> => {
      const { reputationEntries } = await state.getState(
        StateKey.ReputationEntries,
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
