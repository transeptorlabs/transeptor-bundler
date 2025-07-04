import { config } from 'dotenv'

config()

/**
 * [EntryPoint v0.8](https://github.com/eth-infinitism/account-abstraction/releases/latest) is always deployed at address `0x4337084d9e255ff0702461cf8895ce9e3b5ff108`
 */
const DEFAULT_ENTRY_POINT = '0x4337084d9e255ff0702461cf8895ce9e3b5ff108'

const NODE_ENV = process.env.NODE_ENV || 'development'

export const TRANSEPTOR_ENV_VALUES = {
  TRANSEPTOR_LOG_LEVEL:
    process.env.TRANSEPTOR_LOG_LEVEL ||
    (NODE_ENV === 'production' ? 'info' : 'debug'),
  NODE_ENV: process.env.NODE_ENV,

  TRANSEPTOR_ENTRYPOINT_ADDRESS:
    process.env.TRANSEPTOR_ENTRYPOINT_ADDRESS || DEFAULT_ENTRY_POINT,
  TRANSEPTOR_BENEFICIARY: process.env.TRANSEPTOR_BENEFICIARY,
  TRANSEPTOR_MNEMONIC: process.env.TRANSEPTOR_MNEMONIC,

  TRANSEPTOR_WHITELIST: process.env.TRANSEPTOR_WHITELIST,
  TRANSEPTOR_BLACKLIST: process.env.TRANSEPTOR_BLACKLIST,

  TRANSEPTOR_PEER_MULTIADDRS: process.env.PEER_MULTIADDRS,

  TRANSEPTOR_INFLUX_TOKEN: process.env.TRANSEPTOR_INFLUX_TOKEN,
} as const
