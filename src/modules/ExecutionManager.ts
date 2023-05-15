import { Mutex } from 'async-mutex'
import { MempoolManager } from './MempoolManager'
import { Config } from './Config'

/*
  Within the start() method, we've added await this.mutex.acquire() to acquire the mutex lock before executing doBundlerUserOps(). 
  If another doBundlerUserOps() execution is already in progress, the current execution will wait until the lock is released. After the 
  execution of doBundlerUserOps() is complete, the lock is released using release() in the finally block.
*/
export class ExecutionManager {
  private static instance: ExecutionManager | null

  private interval: NodeJS.Timeout | null = null
  private mutex: Mutex = new Mutex()
  private intervalTimer: number

  private constructor(intervalTimer: number) {
    this.intervalTimer = intervalTimer
    this.startAutoBundler()
  }

  public static getInstance(): ExecutionManager {
    if (!this.instance) {
      this.instance = new ExecutionManager(Config.getInstance().getBundleInterval())
    }
    return this.instance
  }

  public startAutoBundler() {
    // Make sure the interval is not already running
    this.stopAutoBundler()
    
    console.log('Set auto bundler with interval: ', this.intervalTimer, 'ms')

    this.interval = setInterval(async () => {
      const release = await this.mutex.acquire()
      try {
        await this.doSendNextBundle()
      } catch (error) {
        console.error('Error running doBundlerUserOps(auto):', error)
      } finally {
        release()
      }
    }, this.intervalTimer)
  }

  public stopAutoBundler() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
      console.log('Stopped auto bundler interval')
    }
  }

  public async forceSendNextBundle() {
    const release = await this.mutex.acquire()
    try {
      await this.doSendNextBundle()
    } catch (error) {
      console.error('Error running doBundlerUserOps(force):', error)
    } finally {
      release()
    }
  }

  private async doSendNextBundle() {
    if (MempoolManager.getInstance().size() === 0) {
      console.log('No user ops to bundle')
      return
    }

    const uops = await MempoolManager.getInstance().createNextUserOpBundle()
    console.log('Sending bundle tranasction to flashbots...', uops)
  }

  public resetInstance(): void {
    ExecutionManager.instance = null
  }
}