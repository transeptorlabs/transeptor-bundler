import { BundleBuilder, StateKey, StateService } from '../types/index.js'
import { Logger } from '../logger/index.js'
import { SendBundleReturn, BundleProcessor } from '../types/index.js'

import { EventManagerWithListener } from '../event/index.js'
import { Mutex } from 'async-mutex'

export type BundleManager = {
  /**
   * Set the bundler mode to auto or manual.
   *
   * @param mode - the bundler mode.
   */
  setBundlingMode: (mode: 'auto' | 'manual') => void

  /**
   * Attempt to bundle the next set of user operations.
   *
   * @returns the result of the bundling attempt.
   */
  doAttemptBundle: (force?: boolean) => Promise<SendBundleReturn>
}

export type BundleManagerConfig = {
  bundleProcessor: BundleProcessor
  bundleBuilder: BundleBuilder
  eventsManager: EventManagerWithListener
  state: StateService
  isAutoBundle: boolean
  autoBundleInterval: number
}

export const createBundleManager = (
  config: BundleManagerConfig,
): BundleManager => {
  const {
    bundleProcessor,
    bundleBuilder,
    eventsManager,
    state,
    isAutoBundle,
    autoBundleInterval,
  } = config

  const mutex = new Mutex()
  let bundleMode: 'auto' | 'manual' = isAutoBundle ? 'auto' : 'manual'
  let interval: NodeJS.Timer | null = null

  const doAttemptBundle = async (
    force?: boolean,
  ): Promise<SendBundleReturn> => {
    // Flush the mempool to remove successful userOps update failed userOps status
    await eventsManager.handlePastEvents()
    const { bundle, storageMap, eip7702Tuples } =
      await bundleBuilder.createBundle(force)
    Logger.debug({ length: bundle.length }, 'bundle created(ready to send)')
    if (bundle.length === 0) {
      Logger.info('No bundle to send, skipping')
      return {
        transactionHash: '',
        userOpHashes: [],
      }
    }

    const { isSendBundleSuccess, transactionHash, userOpHashes, signerIndex } =
      await bundleProcessor.sendBundle(bundle, eip7702Tuples, storageMap)

    if (isSendBundleSuccess) {
      Logger.info(
        {
          transactionHash: transactionHash,
          userOpHashes: userOpHashes,
        },
        'Bundle sent successfully',
      )
      await state.updateState(StateKey.BundleTxs, ({ bundleTxs }) => {
        return {
          bundleTxs: {
            ...bundleTxs,
            [transactionHash]: {
              txHash: transactionHash,
              signerIndex: signerIndex,
              status: 'pending',
            },
          },
        }
      })
    }

    return {
      transactionHash: transactionHash,
      userOpHashes: userOpHashes,
    }
  }

  const stopAutoBundler = () => {
    if (interval) {
      clearInterval(interval)
      interval = null
      Logger.info('Stopping auto bundler interval')
    }
  }

  const startAutoBundler = () => {
    stopAutoBundler()

    Logger.info(`Set auto bundler with interval: ${autoBundleInterval} ms`)

    interval = setInterval(async () => {
      try {
        await mutex.runExclusive(async () => {
          await doAttemptBundle()
        })
      } catch (error: any) {
        Logger.error({ error: error.message }, 'Error running auto bundle:')
      }
    }, autoBundleInterval)
  }

  if (bundleMode === 'auto') {
    startAutoBundler()
  }

  return {
    setBundlingMode: (mode: 'auto' | 'manual') => {
      bundleMode = mode
      Logger.info({ mode }, 'Set bundling mode')

      if (mode === 'auto') {
        startAutoBundler()
      } else {
        stopAutoBundler()
      }
    },

    doAttemptBundle,
  }
}
