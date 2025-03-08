import { Web3API } from '../../types/index.js'

export const createWeb3API = (version: string): Web3API => {
  return {
    clientVersion: (): Promise<string> => {
      return Promise.resolve('transeptor/' + version)
    },
  }
}
