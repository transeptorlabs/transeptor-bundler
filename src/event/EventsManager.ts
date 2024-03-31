import { ethers } from 'ethers'
import { MempoolManager } from '../mempool'
import { ProviderService } from '../provider'
import { ReputationManager } from '../reputation'
import { Logger } from '../logger'
import { Log } from '@ethersproject/providers'

/**
 * listen to events. trigger ReputationManager's Included
 */
export class EventsManager {
  private readonly providerService: ProviderService
  private readonly reputationManager: ReputationManager
  private readonly mempoolManager: MempoolManager
  private readonly entryPointContract: ethers.Contract

  private lastBlock?: number
  private eventAggregator: string | null = null
  private eventAggregatorTxHash: string | null = null

  constructor(
    providerService: ProviderService,
    reputationManager: ReputationManager,
    mempoolManager: MempoolManager,
    entryPointContract: ethers.Contract
  ) {
    this.providerService = providerService
    this.reputationManager = reputationManager
    this.mempoolManager = mempoolManager
    this.entryPointContract = entryPointContract
    this.initEventListener()
  }

  /**
   * automatically listen to all UserOperationEvent events and will flush mempool from already-included UserOperations
   */
  private initEventListener(): void {
    this.entryPointContract.on('UserOperationEvent', (...args) => {
      Logger.debug({args},'UserOperationEvent incomming ->:')
      const ev = args.slice(-1)[0]
      void this.handleEvent(ev as any)
    })
    Logger.debug('Entrypoint contract EventListener listening to UserOperationEvent')
  }

  /**
   * process all new events since last run
  */
  public async handlePastEvents(): Promise<void> {
    if (this.lastBlock === undefined) {
      this.lastBlock = Math.max(
        1,
        (await this.providerService.getBlockNumber()) - 1000
      )
    }
    const events = await this.entryPointContract.queryFilter(
      { address: this.entryPointContract.address },
      this.lastBlock
    )

    Logger.debug({lastBlock: this.lastBlock, events: events.length}, 'Handling past Entrypoint events since last run')
    for (const ev of events) {
      await this.handleEvent(ev)
    }
  }

  private async handleEvent(ev: any): Promise<void> {
    switch (ev.event) {
      case 'UserOperationEvent':
        await this.handleUserOperationEvent(ev as any)
        break
      case 'AccountDeployed':
        this.handleAccountDeployedEvent(ev as any)
        break
      case 'SignatureAggregatorChanged':
        this.handleAggregatorChangedEvent(ev as any)
        break
    }
    this.lastBlock = ev.blockNumber + 1
  }

  private async handleUserOperationEvent(ev: any): Promise<void> {
    const hash = ev.args.userOpHash
    await this.mempoolManager.removeUserOp(hash)
    this.includedAddress(ev.args.sender)
    this.includedAddress(ev.args.paymaster)
    this.includedAddress(this.getEventAggregator(ev))
  }

  // AccountDeployed event is sent before each UserOperationEvent that deploys a contract.
  private handleAccountDeployedEvent(ev: any): void {
    this.includedAddress(ev.args.factory)
  }

  private handleAggregatorChangedEvent(ev: any): void {
    Logger.debug({event: ev.event, aggregator: ev.args.aggregator}, 'handle aggregator changed event')
    this.eventAggregator = ev.args.aggregator
    this.eventAggregatorTxHash = ev.transactionHash
  }

  // aggregator event is sent once per events bundle for all UserOperationEvents in this bundle.
  // it is not sent at all if the transaction is handleOps
  private getEventAggregator(ev: any): string | null {
    if (ev.transactionHash !== this.eventAggregatorTxHash) {
      this.eventAggregator = null
      this.eventAggregatorTxHash = ev.transactionHash
    }
    return this.eventAggregator
  }

  private includedAddress(data: string | null): void {
    if (data != null && data.length > 42) {
      const addr = data.slice(0, 42)
      this.reputationManager.updateIncludedStatus(addr)
    }
  }

  public async getUserOperationEvent (userOpHash: string): Promise<any> {
    // TODO: eth_getLogs is throttled. must be acceptable for finding a UserOperation by hash
    const event = await this.entryPointContract.queryFilter(this.entryPointContract.filters.UserOperationEvent(userOpHash))
    return event[0]
  }

  /* filter full bundle logs, and leave only logs for the given userOpHash
    // @param userOpEvent - the event of our UserOp (known to exist in the logs)
    // @param logs - full bundle logs. after each group of logs there is a single UserOperationEvent with unique hash.
  */
  public filterLogs (userOpEvent: any, logs: Log[]): Log[] {
    let startIndex = -1
    let endIndex = -1
    const events = Object.values(this.entryPointContract.interface.events)
    const foundEvent = events.find(e => e.name === 'BeforeExecution')
    if (!foundEvent) {
      throw new Error('fatal: no BeforeExecution event found')
    }
    
    const beforeExecutionTopic = this.entryPointContract.interface.getEventTopic(foundEvent)
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
  }
}