import { Logger } from '../logger/index.js'
import { BundleTxs, SignerService } from '../types/index.js'
import { ProviderService } from '../provider/index.js'

// Utility function to check if a transaction is pending
const isTransactionPending = async (
  ps: ProviderService,
  txHash: string,
): Promise<boolean> => {
  try {
    const receipt = await ps.getTransactionReceipt(txHash)
    return !receipt // If no receipt, the transaction is likely pending
  } catch (error) {
    Logger.error({ error }, 'Error checking transaction receipt...')
    return false
  }
}

// TODO: Pass signers as an argument
export const createSignerService = (ps: ProviderService): SignerService => {
  return {
    getReadySigner: async (bundleTxs: BundleTxs): Promise<number> => {
      if (Object.keys(bundleTxs).length === 0) {
        return 0
      }

      const pendingStatuses = await Promise.all(
        Object.values(bundleTxs).map(async ({ txHash, signerIndex }) => {
          const isPending = await isTransactionPending(ps, txHash)
          return [signerIndex, isPending] as [number, boolean]
        }),
      )

      const availableSigner = pendingStatuses.find(
        ([_, isPending]) => !isPending,
      )

      return availableSigner ? availableSigner[0] : -1
    },
  }
}
