import { Log } from '@ethersproject/providers'
import { ethers } from 'ethers'

export type CommonEventManager = {
  getUserOperationEvent(userOpHash: string): Promise<ethers.Event>

  /**
   * Filter full bundle logs, and leave only logs for the given userOpHash
   *
   * @param userOpEvent - the event of our UserOp (known to exist in the logs)
   * @param logs - full bundle logs. after each group of logs there is a single UserOperationEvent with unique hash.
   */
  filterLogs(userOpEvent: ethers.Event, logs: Log[]): Log[]
}

export const createCommonEventManager = (
  entryPointContract: ethers.Contract,
): CommonEventManager => {
  return {
    getUserOperationEvent: async (
      userOpHash: string,
    ): Promise<ethers.Event> => {
      // TODO: eth_getLogs is throttled. must be acceptable for finding a UserOperation by hash
      const event = await entryPointContract.queryFilter(
        entryPointContract.filters.UserOperationEvent(userOpHash),
      )
      return event[0]
    },

    filterLogs: (userOpEvent: ethers.Event, logs: Log[]): Log[] => {
      let startIndex = -1
      let endIndex = -1
      const events = Object.values(entryPointContract.interface.events)
      const foundEvent = events.find((e) => e.name === 'BeforeExecution')
      if (!foundEvent) {
        throw new Error('fatal: no BeforeExecution event found')
      }

      const beforeExecutionTopic =
        entryPointContract.interface.getEventTopic(foundEvent)
      logs.forEach((log, index) => {
        if (log?.topics[0] === beforeExecutionTopic) {
          // all UserOp execution events start after the "BeforeExecution" event.
          startIndex = endIndex = index
        } else if (log?.topics[0] === userOpEvent.topics[0]) {
          // process UserOperationEvent
          if (log.topics[1] === userOpEvent.topics[1]) {
            // it's our userOpHash. save as end of logs array
            endIndex = index
          } else {
            // it's a different hash. remember it as beginning index, but only if we didn't find our end index yet.
            if (endIndex === -1) {
              startIndex = index
            }
          }
        }
      })

      if (endIndex === -1) {
        throw new Error('fatal: no UserOperationEvent in logs')
      }

      return logs.slice(startIndex + 1, endIndex)
    },
  }
}
