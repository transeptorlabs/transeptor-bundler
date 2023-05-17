import { Config } from '../../config'

export class Web3API {
  
    clientVersion(): string {
        return 'aa-bundler/' + Config.clientVersion + (Config.isUnsafeMode ? '/unsafe' : '')
    }
}