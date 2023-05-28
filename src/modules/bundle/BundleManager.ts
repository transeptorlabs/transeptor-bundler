import { Mutex } from 'async-mutex'
import { BundleProcessor } from './BundleProcessor'

/*
  This class act as a top-level interface to bundle UserOperations.
  It executes the bundling process periodically(using a javascript interval) or on demand. 
*/
export class BundleManager {
  private readonly bundleProcessor: BundleProcessor

  private interval: any| null = null
  private mutex: Mutex = new Mutex()
  private bundleMode: 'auto' | 'manual'
  private autoBundleInterval: number

  constructor(bundleProcessor: BundleProcessor, isAutoBundle: boolean, autoBundleInterval: number) {
    this.bundleProcessor = bundleProcessor
    this.bundleMode = isAutoBundle ? 'auto' : 'manual'
    this.autoBundleInterval = autoBundleInterval

    if (this.bundleMode === 'auto') {
      this.startAutoBundler()
    }
    console.log('Init BundleManager with bundleMode:', this.bundleMode)
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
    this.stopAutoBundler()
    
    console.log('Set auto bundler with interval: ', this.autoBundleInterval, 'ms')

    this.interval = setInterval(async () => {
      const release = await this.mutex.acquire()
      try {
        await this.doAttemptBundle()
      } catch (error) {
        console.error('Error running auto bundle:', error)
      } finally {
        release()
      }
    }, this.autoBundleInterval)
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
    return await this.bundleProcessor.sendNextBundle()
  }
}
