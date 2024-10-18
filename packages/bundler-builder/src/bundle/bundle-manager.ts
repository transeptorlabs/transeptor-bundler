import { MempoolManagerBuilder } from '../mempool/index.js'
import { Logger } from '../../../shared/logger/index.js'
import { SendBundleReturn } from '../../../shared/types/index.js'

import { BundleBuilder } from './bundle-builder.js'
import { BundleProcessor } from './bundle-processor.js'
import { EventManagerWithListener } from '../event/index.js'
import { MempoolEntry } from '../state/index.js'

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
  mempoolManagerBuilder: MempoolManagerBuilder,
  isAutoBundle: boolean,
  autoBundleInterval: number,
): BundleManager => {
  let bundleMode: 'auto' | 'manual' = isAutoBundle ? 'auto' : 'manual'
  let interval: NodeJS.Timer | null = null

  const getEntries = async (force?: boolean): Promise<MempoolEntry[]> => {
    if ((await mempoolManagerBuilder.size()) === 0) {
      return []
    }

    // if force is true, send the all pending UserOps in the mempool as a bundle
    const entries: MempoolEntry[] = force
      ? await mempoolManagerBuilder.getAllPending()
      : await mempoolManagerBuilder.getNextPending()

    return entries
  }

  const doAttemptBundle = async (
    force?: boolean,
  ): Promise<SendBundleReturn> => {
    // Flush the mempool to remove succeful userOps update failed userOps status
    await eventsManager.handlePastEvents()

    const entries = await getEntries(force)
    if (entries.length === 0) {
      Logger.debug('No entries to bundle')
      return {
        transactionHash: '',
        userOpHashes: [],
      }
    }

    const knownSenders = await mempoolManagerBuilder.getKnownSenders()

    const {
      bundle,
      storageMap,
      notIncludedUserOpsHashes,
      markedToRemoveUserOpsHashes,
    } = await bundleBuilder.createBundle(entries, knownSenders)
    Logger.debug({ length: bundle.length }, 'bundle created(ready to send)')

    if (notIncludedUserOpsHashes.length > 0) {
      Logger.debug(
        { total: notIncludedUserOpsHashes.length },
        'Bundle full: sending unbundled UserOps back to mempool with status of pending',
      )
      notIncludedUserOpsHashes.forEach(async (userOpHash) => {
        await mempoolManagerBuilder.updateEntryStatus(userOpHash, 'pending')
      })
    }

    if (markedToRemoveUserOpsHashes.length > 0) {
      Logger.debug(
        { total: markedToRemoveUserOpsHashes.length },
        'Bundle full: removing banned UserOps from mempool',
      )
      markedToRemoveUserOpsHashes.forEach(async (userOpHash) => {
        await mempoolManagerBuilder.removeUserOp(userOpHash)
      })
    }

    const res = await bundleProcessor.sendBundle(bundle, storageMap)
    if (res.failedOp) {
      Logger.error({ failedOp: res.failedOp }, 'Bundle failed')
      await mempoolManagerBuilder.removeUserOp(res.failedOp)
    }

    await mempoolManagerBuilder.addBundleTxnConfirmation(
      res.transactionHash,
      res.signerIndex,
    )

    return {
      transactionHash: res.transactionHash,
      userOpHashes: res.userOpHashes,
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
