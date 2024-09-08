export type Web3API = {
    clientVersion(): string
}

export const createWeb3API = (version: string, isUnsafeMode: boolean): Web3API => {
    return {
        clientVersion:(): string => {
            return 'transeptor/' + version + (isUnsafeMode ? '/unsafe' : '')
        }
    }
}