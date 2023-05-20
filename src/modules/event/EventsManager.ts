import { Config } from '../config'
import { MempoolManager } from '../mempool'
import { ProviderService } from '../provider'
import { ReputationManager } from '../reputation'

/**
 * listen to events. trigger ReputationManager's Included
 */
class EventsManager {
  private static instance: EventsManager | undefined = undefined
  private providerService: ProviderService = new ProviderService()
  private lastBlock?: number

  private eventAggregator: string | null = null
  private eventAggregatorTxHash: string | null = null

  private constructor () {
    this.initEventListener()
  }

  public static getInstance(): EventsManager {
    if (!this.instance) {
      this.instance = new EventsManager()
    }
    return this.instance
  }

  /**
   * automatically listen to all UserOperationEvent events and will flush mempool from already-included UserOperations
   */
  initEventListener (): void {
    Config.entryPointContract.on('UserOperationEvent', (...args) => {
      console.log('UserOperationEvent:', args)
      const ev = args.slice(-1)[0]
      void this.handleEvent(ev as any)
    })
    console.log('init Entrypoint contract EventListener')
  }

   /**
   * process all new events since last run
   */
   async handlePastEvents (): Promise<void> {
    if (this.lastBlock === undefined) {
      this.lastBlock = Math.max(1, await this.providerService.getBlockNumber() - 1000)
    }
    const events = await Config.entryPointContract.queryFilter({ address: Config.entryPointAddr }, this.lastBlock)
    for (const ev of events) {
      this.handleEvent(ev)
    }
  }

  private handleEvent (ev: any): void {
    switch (ev.event) {
      case 'UserOperationEvent':
        this.handleUserOperationEvent(ev as any)
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

  private handleUserOperationEvent (ev: any): void {
    const hash = ev.args.userOpHash
    MempoolManager.removeUserOp(hash)
    this.includedAddress(ev.args.sender)
    this.includedAddress(ev.args.paymaster)
    this.includedAddress(this.getEventAggregator(ev))
  }

  // AccountDeployed event is sent before each UserOperationEvent that deploys a contract.
  private handleAccountDeployedEvent (ev: any): void {
    this.includedAddress(ev.args.factory)
  }

  private handleAggregatorChangedEvent (ev: any): void {
    console.log('handle ', ev.event, ev.args.aggregator)
    this.eventAggregator = ev.args.aggregator
    this.eventAggregatorTxHash = ev.transactionHash
  }

  // aggregator event is sent once per events bundle for all UserOperationEvents in this bundle.
  // it is not sent at all if the transaction is handleOps
  private getEventAggregator (ev: any): string | null {
    if (ev.transactionHash !== this.eventAggregatorTxHash) {
      this.eventAggregator = null
      this.eventAggregatorTxHash = ev.transactionHash
    }
    return this.eventAggregator
  }

  private includedAddress (data: string | null): void {
    if (data != null && data.length > 42) {
      const addr = data.slice(0, 42)
      ReputationManager.updateIncludedStatus(addr)
    }
  }
}

const eventsManagerInstance = EventsManager.getInstance()
export { eventsManagerInstance as EventsManager }