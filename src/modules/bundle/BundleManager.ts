import { Mutex } from 'async-mutex'
import { BundleProcessor } from './BundleProcessor'
import { Logger } from '../logger'

/*
  This class act as a top-level interface to bundle UserOperations.
  It executes the bundling process periodically(using a javascript interval) or on demand. 
*/
export class BundleManager {
  private readonly bundleProcessor: BundleProcessor

  private interval: any | null = null
  private mutex: Mutex = new Mutex()
  private bundleMode: 'auto' | 'manual'
  private autoBundleInterval: number

  constructor(
    bundleProcessor: BundleProcessor,
    isAutoBundle: boolean,
    autoBundleInterval: number,
  ) {
    this.bundleMode = isAutoBundle ? 'auto' : 'manual'
    this.autoBundleInterval = autoBundleInterval
    this.bundleProcessor = bundleProcessor

    if (this.bundleMode === 'auto') {
      this.startAutoBundler()
    }
    Logger.debug(
      { bundleMode: this.bundleMode },
      'Init BundleManager with bundleMode:'
    )
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

    Logger.info(
      `Set auto bundler with interval: ${this.autoBundleInterval} ms`
    )

    this.interval = setInterval(async () => {
      try {
        await this.doAttemptAutoBundle(false)
      } catch (error: any) {
        Logger.error({ error: error.mesage }, 'Error running auto bundle:')
      }
    }, this.autoBundleInterval)
  }

  public stopAutoBundler() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
      Logger.info('Stopping auto bundler interval')
    }
  }

  public async doAttemptAutoBundle(force: boolean): Promise<string> {
    const release = await this.mutex.acquire()
    try {
      Logger.debug({ force }, 'attepting to sendNextBundle')
      return await this.bundleProcessor.sendNextBundle(force)
    } finally {
      release()
    }
  }
}
