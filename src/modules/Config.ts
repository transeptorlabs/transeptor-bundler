import { OptionValues } from "commander";

export class Config {
  private static instance: Config;

  private constructor(programOpts: OptionValues) {
    try {

    } catch (error) {
      throw new Error(`Unable to rest up config gobal ${programOpts}: ${error.message as string}`)
    }
  }

  public static getInstance(programOpts: OptionValues): Config {
    if (!this.instance) {
      this.instance = new Config(programOpts);
    }
    return this.instance;
  }

  /**
   * for debugging/testing: clear current in-memory instance of MempoolManager
   */
  public resetInstance(): void {
    Config.instance = null;
  }
}
