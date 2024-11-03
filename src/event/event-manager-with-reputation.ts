import { ethers } from 'ethers'
import { Log } from '@ethersproject/providers'

import { Logger } from '../logger/index.js'
import { ProviderService } from '../provider/index.js'
import { ReputationManager } from '../reputation/index.js'
import { MempoolManageUpdater } from '../mempool/index.js'

export type EventManagerWithListener = {
  /**
   * Process all new events since last run
   */
  handlePastEvents: () => Promise<void>

  getUserOperationEvent(userOpHash: string): Promise<ethers.Event>

  /**
   * Filter full bundle logs, and leave only logs for the given userOpHash
   *
   * @param userOpEvent - the event of our UserOp (known to exist in the logs)
   * @param logs - full bundle logs. after each group of logs there is a single UserOperationEvent with unique hash.
   */
  filterLogs(userOpEvent: ethers.Event, logs: Log[]): Log[]
}

export const createEventManagerWithListener = (
  providerService: ProviderService,
  reputationManager: ReputationManager,
  mempoolManageUpdater: MempoolManageUpdater,
  entryPointContract: ethers.Contract,
): EventManagerWithListener => {
  let lastBlock: number | null = null
  let eventAggregator: string | null = null
  let eventAggregatorTxHash: string | null = null

  /**
   * Handle an event from the entrypoint contract.
   *
   * @param ev - the event
   */
  const handleEvent = async (ev: ethers.Event): Promise<void> => {
    switch (ev.event) {
      case 'UserOperationEvent':
        await handleUserOperationEvent(ev as any)
        break
      case 'AccountDeployed':
        handleAccountDeployedEvent(ev as any)
        break
      case 'SignatureAggregatorChanged':
        handleAggregatorChangedEvent(ev as any)
        break
    }
    lastBlock = ev.blockNumber + 1
  }

  /**
   * Aggregator event is sent once per events bundle for all UserOperationEvents in this bundle.
   * it is not sent at all if the transaction is handleOps
   *
   * @param ev - the event
   * @returns the aggregator address
   */
  const getEventAggregator = (ev: any): string | null => {
    if (ev.transactionHash !== eventAggregatorTxHash) {
      eventAggregator = null
      eventAggregatorTxHash = ev.transactionHash
    }
    return eventAggregator
  }

  /**
   * Update the reputation status of an address.
   *
   * @param data - the address to check
   */
  const includedAddress = (data: string | null): void => {
    if (data != null && data.length > 42) {
      const addr = data.slice(0, 42)
      reputationManager.updateIncludedStatus(addr)
    }
  }

  /**
   * UserOperationEvent event is sent once entrypoint handleOps finishes execution for the userOp.
   *
   * @param ev - the event
   */
  const handleUserOperationEvent = async (ev: any): Promise<void> => {
    const userOpHash = ev.args.userOpHash
    const sucess = ev.args.success

    if (sucess) {
      Logger.debug(
        { userOpHash },
        'UserOperationEvent success. Removing from mempool',
      )
      await mempoolManageUpdater.removeUserOp(userOpHash)
    } else {
      Logger.debug(
        { userOpHash },
        'UserOperationEvent failed. Updating status in mempool',
      )
      await mempoolManageUpdater.updateEntryStatus(userOpHash, 'failed')
    }

    // TODO: Make this a batch operation
    includedAddress(ev.args.sender)
    includedAddress(ev.args.paymaster)
    includedAddress(getEventAggregator(ev))
  }

  /**
   * AccountDeployed event is sent before each UserOperationEvent that deploys a contract.
   *
   * @param ev - the event
   */
  const handleAccountDeployedEvent = (ev: any): void => {
    includedAddress(ev.args.factory)
  }

  const handleAggregatorChangedEvent = (ev: any): void => {
    eventAggregator = ev.args.aggregator
    eventAggregatorTxHash = ev.transactionHash
  }

  /**
   * Automatically listen to all UserOperationEvent events and will flush mempool from already-included UserOperations
   */
  const initEventListener = (): void => {
    entryPointContract.on('UserOperationEvent', (...args) => {
      const ev = args.slice(-1)[0]
      void handleEvent(ev as any)
    })
    Logger.debug(
      'Entrypoint contract EventListener listening to events(UserOperationEvent, AccountDeployed, SignatureAggregatorChanged)',
    )
  }

  initEventListener()

  return {
    handlePastEvents: async (): Promise<void> => {
      if (!lastBlock) {
        lastBlock = Math.max(1, (await providerService.getBlockNumber()) - 1000)
      }
      const events = await entryPointContract.queryFilter(
        { address: entryPointContract.address },
        lastBlock,
      )

      Logger.debug(
        { lastBlock: lastBlock, events: events.length },
        'Handling past Entrypoint events since last run',
      )
      for (const ev of events) {
        await handleEvent(ev)
      }
    },

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
