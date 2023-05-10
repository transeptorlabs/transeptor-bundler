import { OptionValues } from "commander"

export class Config {
  private static instance: Config | null

  private constructor(programOpts: OptionValues) {
    try {
      //
    } catch (error: any) {
      throw new Error(`Unable to rest up config gobal ${programOpts}: ${error.message as string}`)
    }
  }

  public static getInstance(programOpts?: OptionValues): Config {
    if (!this.instance) {
      if (!programOpts) {
        throw new Error("Config not initialized")
      }
      this.instance = new Config(programOpts)
    }
    return this.instance
  }

  getBundleSize(): number {
    return 5
  }

  /**
   * for debugging/testing: clear current in-memory instance of MempoolManager
   */
  public resetInstance(): void {
    Config.instance = null
  }
}
