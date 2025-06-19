import {
  BundleBuilder,
  StateKey,
  StateService,
  TranseptorLogger,
  Capability,
  CapabilityTypes,
} from '../types/index.js'
import { SendBundleReturn, BundleProcessor } from '../types/index.js'

import { EventManager } from '../event/index.js'
import { Mutex } from 'async-mutex'
import { withReadonly } from '../utils/index.js'

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
  eventsManager: EventManager
  stateService: StateService
  stateCapability: Capability<CapabilityTypes.State>
  isAutoBundle: boolean
  autoBundleInterval: number
  logger: TranseptorLogger
}

/**
 * Creates an instance of the BundleManager module.
 *
 * @param config - The configuration object for the BundleManager instance.
 * @returns An instance of the BundleManager module.
 */
function _createBundleManager(
  config: Readonly<BundleManagerConfig>,
): BundleManager {
  const {
    bundleProcessor,
    bundleBuilder,
    eventsManager,
    stateService: state,
    isAutoBundle,
    autoBundleInterval,
    logger,
    stateCapability,
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

    if (bundle.length === 0) {
      logger.info('No bundle to send, skipping')
      return {
        transactionHash: '',
        userOpHashes: [],
      }
    }

    const { isSendBundleSuccess, transactionHash, userOpHashes, signerIndex } =
      await bundleProcessor.sendBundle(bundle, eip7702Tuples, storageMap)

    if (isSendBundleSuccess) {
      logger.info(
        {
          transactionHash: transactionHash,
          userOpHashes: userOpHashes,
        },
        'Bundle sent successfully',
      )
      await state.updateState(
        stateCapability,
        StateKey.BundleTxs,
        ({ bundleTxs }) => {
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
        },
      )
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
      logger.info('Stopping auto bundler interval')
    }
  }

  const startAutoBundler = () => {
    stopAutoBundler()

    logger.info(`Set auto bundler with interval: ${autoBundleInterval} ms`)

    interval = setInterval(async () => {
      try {
        await mutex.runExclusive(async () => {
          await doAttemptBundle()
        })
      } catch (error: any) {
        logger.error({ error: error.message }, 'Error running auto bundle:')
      }
    }, autoBundleInterval)
  }

  if (bundleMode === 'auto') {
    startAutoBundler()
  }

  return {
    setBundlingMode: (mode: 'auto' | 'manual') => {
      bundleMode = mode
      logger.info({ mode }, 'Set bundling mode')

      if (mode === 'auto') {
        startAutoBundler()
      } else {
        stopAutoBundler()
      }
    },

    doAttemptBundle,
  }
}

export const createBundleManager = withReadonly<
  BundleManagerConfig,
  BundleManager
>(_createBundleManager)
