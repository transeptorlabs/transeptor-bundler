export type Web3APIMethodMapping = {
  web3_clientVersion: {
    params: []
    return: string
  }
}

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
