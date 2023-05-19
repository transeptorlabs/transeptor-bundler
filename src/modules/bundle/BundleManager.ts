import { Mutex } from 'async-mutex'
import { MempoolManager }  from '../mempool'
import { Config } from '../config'
import { BundleProcessor } from './BundleProcessor'

/*
  This signleton class act as a top-level interface to bundle UserOperations.
  It executes the bundling process periodically(using a javascript interval) or on demand. 
*/
class BundleManager {
  private static instance: BundleManager | undefined = undefined

  private interval: any| null = null
  private mutex: Mutex = new Mutex()
  private bundleMode: 'auto' | 'manual'
  private bundleProcessor: BundleProcessor = new BundleProcessor()

  private constructor() {
    this.bundleMode = Config.isAutoBundle ? 'auto' : 'manual'
    if (this.bundleMode === 'auto') {
      this.startAutoBundler()
    }
    console.log('Done init BundleManager global with bundleMode:', this.bundleMode)
  }

  public static getInstance(): BundleManager {
    if (!this.instance) {
      this.instance = new BundleManager()
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

  /*
    We've added await this.mutex.acquire() to acquire the mutex lock before executing doAttemptBundle(). 
    If another doAttemptBundle() execution is already in progress, the current execution will wait until the lock is released. After the 
    execution of doAttemptBundle() is complete, the lock is released using release() in the finally block.
  */
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

    try {
      const result =  await this.doAttemptBundle()
      return result
    } catch (error) {
      console.log('Error running force bundle:', error)
      throw error
    } finally {
      release()
    }
  }

  private async doAttemptBundle(): Promise<string> {
    if (MempoolManager.size() === 0) {
      console.log('No user ops to bundle')
      return ''
    }

    const entities = await MempoolManager.createNextBundle()
    return this.bundleProcessor.sendNextBundle(entities)
  }
}

export default BundleManager.getInstance()

const bundleManagerInstance = BundleManager.getInstance()
export { bundleManagerInstance as BundleManager }