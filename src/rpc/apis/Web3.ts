export type Web3API = {
  clientVersion(): string
}

export const createWeb3API = (version: string): Web3API => {
  return {
    clientVersion: (): string => {
      return 'transeptor/' + version
    },
  }
}
