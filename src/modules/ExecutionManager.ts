import { Mutex } from 'async-mutex'
import MempoolManager  from './MempoolManager'
import Config from './Config'

/*
  Within the start() method, we've added await this.mutex.acquire() to acquire the mutex lock before executing doBundlerUserOps(). 
  If another doBundlerUserOps() execution is already in progress, the current execution will wait until the lock is released. After the 
  execution of doBundlerUserOps() is complete, the lock is released using release() in the finally block.
*/
export class ExecutionManager {
  private static instance: ExecutionManager | undefined = undefined

  private interval: NodeJS.Timeout | null = null
  private mutex: Mutex = new Mutex()
  private bundleMode: 'auto' | 'manual'

  private constructor() {
    this.bundleMode = Config.isAutoBundle ? 'auto' : 'manual'
    if (this.bundleMode === 'auto') {
      this.startAutoBundler()
    }
    console.log('Done init ExecutionManager global with bundleMode:', this.bundleMode)
  }

  public static getInstance(): ExecutionManager {
    if (!this.instance) {
      this.instance = new ExecutionManager()
    }
    return this.instance
  }

  public setBundlingMode(mode: 'auto' | 'manual') {
    this.bundleMode = mode
    
    if (mode === 'auto') {
      this.startAutoBundler()
    } else {
      this.stopAutoBundler()
    }
  }

  public startAutoBundler() {
    // Make sure the interval is not already running
    this.stopAutoBundler()
    
    console.log('Set auto bundler with interval: ', Config.autoBundleInterval, 'ms')

    this.interval = setInterval(async () => {
      const release = await this.mutex.acquire()
      try {
        await this.doAttemptBundle()
      } catch (error) {
        console.error('Error running auto bundle:', error)
      } finally {
        release()
      }
    }, Config.autoBundleInterval)
  }

  public stopAutoBundler() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
      console.log('Stopping auto bundler interval')
    }
  }

  public async forceSendBundle(): Promise<string> {
    const release = await this.mutex.acquire()
    const result =  await this.doAttemptBundle()

    release()
    return result
  }

  private async doAttemptBundle(): Promise<string> {
    if (MempoolManager.size() === 0) {
      console.log('No user ops to bundle')
      return ''
    }

    const uops = await MempoolManager.createNextUserOpBundle()
    console.log('Sending bundle tranasction to ...', uops)
    return ''
  }
}

export default ExecutionManager.getInstance()