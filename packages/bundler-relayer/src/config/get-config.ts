import { createRelayerConfig, Config } from './create-config.js'

let config: Config | undefined = undefined

export const initializeConfig = (args: readonly string[]): void => {
  if (config) {
    throw new Error('Configuration is already initialized.')
  }
  config = createRelayerConfig(args)
}

export const getConfig = (): Config => {
  if (!config) {
    throw new Error('Configuration is not initialized.')
  }
  return config
}
