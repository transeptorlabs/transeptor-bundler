import { Deferrable } from '@ethersproject/properties'
import { TransactionRequest } from '@ethersproject/providers'
import { Wallet, ethers } from 'ethers'
import { resolveProperties } from 'ethers/lib/utils.js'
import { Logger } from '../../../shared/logger/index.js'
import { BundleTxs } from '../state/index.js'
import { ProviderService } from '../../../shared/provider/index.js'

export type BundlerSignerWallets = Record<number, Wallet>

export type SignerService = {
  /**
   * Finds the first signer without a pending bundle transaction and returns the index.
   *
   * @param bundleTxs - Record of bundleTxs.
   * @returns - Return the index of the available signer, -1 if all are busy, or 0 immediately if bundleTxs is empty.
   */
  getReadySigner(bundleTxs: BundleTxs): Promise<number>

  getSignerBalance(signer: Wallet): Promise<ethers.BigNumber>

  getSignerAddress(signer: Wallet): Promise<string>

  getTransactionCount(signer: Wallet): Promise<number>

  signTransaction(
    tx: Deferrable<TransactionRequest>,
    signer: Wallet,
  ): Promise<string>
}

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

    getSignerBalance: async (signer: Wallet): Promise<ethers.BigNumber> => {
      return await signer.getBalance()
    },

    getSignerAddress: async (signer: Wallet): Promise<string> => {
      return await signer.getAddress()
    },

    getTransactionCount: async (signer: Wallet): Promise<number> => {
      return await signer.getTransactionCount()
    },

    signTransaction: async (
      tx: Deferrable<TransactionRequest>,
      signer: Wallet,
    ): Promise<string> => {
      const tx1 = await resolveProperties(tx)
      return signer.signTransaction(tx1)
    },
  }
}
