import {
  MempoolStateKey,
  MempoolStateService,
} from '../mempool/mempool.types.js'
import { Logger } from '../../../shared/logger/index.js'
import { SendBundleReturn } from '../../../shared/types/index.js'

import { BundleBuilder } from './bundle-builder.js'
import { BundleProcessor } from './bundle-processor.js'
import { EventManagerWithListener } from '../event/index.js'

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

export const createBundleManager = (
  bundleProcessor: BundleProcessor,
  bundleBuilder: BundleBuilder,
  eventsManager: EventManagerWithListener,
  mp: MempoolStateService,
  isAutoBundle: boolean,
  autoBundleInterval: number,
): BundleManager => {
  let bundleMode: 'auto' | 'manual' = isAutoBundle ? 'auto' : 'manual'
  let interval: NodeJS.Timer | null = null

  const doAttemptBundle = async (
    force?: boolean,
  ): Promise<SendBundleReturn> => {
    // Flush the mempool to remove succeful userOps update failed userOps status
    await eventsManager.handlePastEvents()

    const [bundle, storageMap] = await bundleBuilder.createBundle(force)
    Logger.debug({ length: bundle.length }, 'bundle created(ready to send)')
    if (bundle.length === 0) {
      return {
        transactionHash: '',
        userOpHashes: [],
      }
    }

    const result = await bundleProcessor.sendBundle(bundle, storageMap)

    //  Add the txnHash to the confirmation queue(MempoolState.bundleTxs)
    await mp.updateState(MempoolStateKey.BundleTxs, ({ bundleTxs }) => {
      return {
        bundleTxs: {
          ...bundleTxs,
          [result.transactionHash]: {
            txHash: result.transactionHash,
            signerIndex: result.signerIndex,
            status: 'pending',
          },
        },
      }
    })

    return {
      transactionHash: result.transactionHash,
      userOpHashes: result.userOpHashes,
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
        await doAttemptBundle()
      } catch (error: any) {
        Logger.error({ error: error.mesage }, 'Error running auto bundle:')
      }
    }, autoBundleInterval)
  }

  if (bundleMode === 'auto') {
    startAutoBundler()
  }

  Logger.info(
    `Bundler mode set to ${bundleMode} with interval ${autoBundleInterval} ms`,
  )

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
