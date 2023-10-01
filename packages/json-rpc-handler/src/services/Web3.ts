export class Web3API {
    private readonly version: string
    private readonly isUnsafeMode: boolean

    constructor(version: string, isUnsafeMode: boolean) {
        this.version = version
        this.isUnsafeMode = isUnsafeMode
    }
  
    clientVersion(): string {
        return 'transeptor/' + this.version + (this.isUnsafeMode ? '/unsafe' : '')
    }
}