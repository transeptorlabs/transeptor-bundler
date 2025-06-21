import { ethers, EventFragment, Log } from 'ethers'

import { Either } from '../monad/index.js'
import { ProviderService } from '../provider/index.js'
import {
  MempoolManageUpdater,
  ReputationManager,
  TranseptorLogger,
} from '../types/index.js'
import { withReadonly } from '../utils/index.js'

export type EventManager = {
  /**
   * Process all new events since last run
   */
  handlePastEvents: () => Promise<void>

  getUserOperationEvent(userOpHash: string): Promise<ethers.EventLog>

  /**
   * Filter full bundle logs, and leave only logs for the given userOpHash
   *
   * @param userOpEvent - the event of our UserOp (known to exist in the logs)
   * @param logs - full bundle logs. after each group of logs there is a single UserOperationEvent with unique hash.
   * @returns logs for the given userOpHash or an error if not found
   */
  filterLogs(
    userOpEvent: ethers.EventLog,
    logs: readonly Log[],
  ): Either<Error, Log[]>
}

export type EventManagerConfig = {
  providerService: ProviderService
  reputationManager: ReputationManager
  mempoolManageUpdater: MempoolManageUpdater
  logger: TranseptorLogger
}

/**
 * Creates an instance of the EventManager module.
 *
 * @param config - The configuration object for the EventManager instance.
 * @returns An instance of the EventManager module.
 */
function _createEventManager(
  config: Readonly<EventManagerConfig>,
): EventManager {
  const { providerService, reputationManager, mempoolManageUpdater, logger } =
    config
  const entryPointContract =
    providerService.getEntryPointContractDetails().contract
  let lastBlock: number | null = null
  let eventAggregator: string | null = null
  let eventAggregatorTxHash: string | null = null
  const LAST_1000_BLOCKS = 1000

  /**
   * Handle an event from the entrypoint contract.
   *
   * @param ev - the event
   */
  const handleEvent = async (ev: ethers.EventLog): Promise<void> => {
    switch (ev.fragment.name) {
      case 'UserOperationEvent':
        await handleUserOperationEvent(ev)
        break
      case 'AccountDeployed':
        await handleAccountDeployedEvent(ev)
        break
      case 'SignatureAggregatorChanged':
        handleAggregatorChangedEvent(ev)
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
  const includedAddress = async (data: string | null): Promise<void> => {
    if (data != null && data.length > 42) {
      const addr = data.slice(0, 42)
      await reputationManager.updateIncludedStatus(addr)
    }
  }

  /**
   * UserOperationEvent event is sent once entrypoint handleOps finishes execution for the userOp.
   *
   * @param ev - the event
   */
  const handleUserOperationEvent = async (
    ev: ethers.EventLog,
  ): Promise<void> => {
    const userOpHash = ev.args.userOpHash
    const success = ev.args.success

    success
      ? await mempoolManageUpdater.removeUserOp(userOpHash)
      : await mempoolManageUpdater.updateEntryStatus(userOpHash, 'failed')

    // TODO: Make this a batch operation
    await includedAddress(ev.args.sender)
    await includedAddress(ev.args.paymaster)
    await includedAddress(getEventAggregator(ev))
  }

  /**
   * AccountDeployed event is sent before each UserOperationEvent that deploys a contract.
   *
   * @param ev - the event
   */
  const handleAccountDeployedEvent = async (
    ev: ethers.EventLog,
  ): Promise<void> => {
    await includedAddress(ev.args.factory)
  }

  const handleAggregatorChangedEvent = (ev: ethers.EventLog): void => {
    eventAggregator = ev.args.aggregator
    eventAggregatorTxHash = ev.transactionHash
  }

  /**
   * Automatically listen to all UserOperationEvent events and will flush mempool from already-included UserOperations
   */
  const initEventListener = (): void => {
    entryPointContract.on('UserOperationEvent', async (...args) => {
      const ev = args.slice(-1)[0] // last argument is the event
      if (ev.args == null) {
        logger.error('UserOperationEvent event without args')
        return
      }
      await handleEvent(ev as any)
    })
    logger.debug(
      'Entrypoint contract EventListener listening to events(UserOperationEvent)',
    )
  }

  initEventListener()

  return {
    handlePastEvents: async (): Promise<void> => {
      if (!lastBlock) {
        lastBlock = Math.max(
          1,
          (await providerService.getBlockNumber()) - LAST_1000_BLOCKS,
        )
      }

      const filters = [
        entryPointContract.filters.UserOperationEvent(),
        entryPointContract.filters.AccountDeployed(),
        entryPointContract.filters.SignatureAggregatorChanged(),
      ]
      const allEventLogs = await Promise.all(
        filters.map((filter) =>
          entryPointContract.queryFilter(filter, lastBlock),
        ),
      )
      const events = allEventLogs.flat()

      logger.debug(
        { lastBlock: lastBlock, events: events.length },
        'Handling past Entrypoint events since last run',
      )
      for (const event of events) {
        if ('args' in event && 'eventName' in event) {
          await handleEvent(event)
        } else {
          // We are not interested in raw logs
        }
      }
    },

    getUserOperationEvent: async (
      userOpHash: string,
    ): Promise<ethers.EventLog> => {
      // TODO: eth_getLogs is throttled. must be acceptable for finding a UserOperation by hash
      const events = await entryPointContract.queryFilter(
        entryPointContract.filters.UserOperationEvent(userOpHash),
      )

      if (events.length === 0 || !events[0]) {
        return null
      }

      const ev = events[0] as ethers.EventLog
      if ('args' in ev) {
        return ev
      }

      return null
    },

    filterLogs: (
      userOpEvent: ethers.EventLog,
      logs: readonly Log[],
    ): Either<Error, Log[]> => {
      let startIndex = -1
      let endIndex = -1

      const events = entryPointContract.interface.fragments.filter(
        (fragment) => fragment.type === 'event',
      ) as EventFragment[]

      // Find the "BeforeExecution" event fragment
      const beforeExecutionEvent = events.find(
        (e) => e.name === 'BeforeExecution',
      )

      if (!beforeExecutionEvent) {
        return Either.Left(new Error('fatal: no BeforeExecution event found'))
      }

      logs.forEach((log, index) => {
        if (log?.topics[0] === beforeExecutionEvent.topicHash) {
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
        return Either.Left(new Error('fatal: no UserOperationEvent in logs'))
      }

      return Either.Right(logs.slice(startIndex + 1, endIndex))
    },
  }
}

export const createEventManager = withReadonly<
  EventManagerConfig,
  EventManager
>(_createEventManager)
