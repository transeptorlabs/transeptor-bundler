import Config from '../../Config'

export class Web3API {
  
    clientVersion(): string {
        return 'aa-bundler/' + Config.clientVersion + (Config.isUnsafeMode ? '/unsafe' : '')
    }
}