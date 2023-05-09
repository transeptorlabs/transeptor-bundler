import { Mutex } from "async-mutex"
import { MempoolManager } from "./MempoolManager"

/*
  Within the start() method, we've added await this.mutex.acquire() to acquire the mutex lock before executing doBundlerUserOps(). 
  If another doBundlerUserOps() execution is already in progress, the current execution will wait until the lock is released. After the 
  execution of doBundlerUserOps() is complete, the lock is released using release() in the finally block.
*/
export class ExecutionManager {
  private static instance: ExecutionManager

  private interval: NodeJS.Timeout | null = null
  private mutex: Mutex = new Mutex()
  private intervalTimer: number

  private constructor() {
    this.intervalTimer = 2 * 60 * 1000 // 2 minutes in milliseconds
    this.startAutoBundler()
  }

  public static getInstance(): ExecutionManager {
    if (!this.instance) {
      this.instance = new ExecutionManager()
    }
    return this.instance
  }

  startAutoBundler() {
    // Make sure the interval is not already running
    this.stopAutoBundler()

    this.interval = setInterval(async () => {
      const release = await this.mutex.acquire()
      try {
        await this.doSendNextBundle()
      } catch (error) {
        console.error("Error running doBundlerUserOps(auto):", error)
      } finally {
        release()
      }
    }, this.intervalTimer)
  }

  stopAutoBundler() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
      console.log("Stopped auto bundler interval")
    }
  }

  public async forceSendNextBundle() {
    const release = await this.mutex.acquire()
    try {
      await this.doSendNextBundle()
    } catch (error) {
      console.error("Error running doBundlerUserOps(force):", error)
    } finally {
      release()
    }
  }

  private async doSendNextBundle() {
    if (MempoolManager.getInstance().size() === 0) {
      console.log("No user ops to bundle")
      return
    }

    const uops = await MempoolManager.getInstance().createNextUserOpBundle()
    console.log("Sending bundle tranasction to flashbots...", uops)

    // Simulating an asynchronous operation
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  public resetInstance(): void {
    ExecutionManager.instance = null
  }
}
