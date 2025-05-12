import { ethers } from 'ethers'
import { Logger } from '../../logger/index.js'
import { ProviderService } from '../../provider/index.js'
import {
  SendBundleReturnWithSigner,
  StorageMap,
  UserOperation,
  BundlerSignerWallets,
  MempoolManagerBuilder,
  BundleProcessor,
  CrashedHandleOps,
  ReputationManager,
} from '../../types/index.js'
import { packUserOps } from '../../utils/index.js'
import { getUserOpHashes, selectBeneficiary } from './processor.helpers.js'
import { findEntityToBlame, checkFatal } from '../bundle.helper.js'
import { parseFailedOpRevert } from '../builder/builder.helpers.js'

export type BundleProcessorConfig = {
  providerService: ProviderService
  reputationManager: ReputationManager
  mempoolManagerBuilder: MempoolManagerBuilder
  entryPoint: {
    contract: ethers.Contract
    address: string
  }
  txMode: string
  beneficiary: string
  minSignerBalance: bigint
  signers: BundlerSignerWallets
}

export const createBundleProcessor = (
  config: BundleProcessorConfig,
): BundleProcessor => {
  const {
    providerService,
    reputationManager,
    mempoolManagerBuilder,
    entryPoint,
    txMode,
    beneficiary,
    minSignerBalance,
    signers,
  } = config

  const afterHook = async (crashedHandleOps: CrashedHandleOps | undefined) => {
    Logger.debug('After hook running for bundle processor')
    if (crashedHandleOps) {
      const { failedUserOp, reasonStr, addressToBan } = crashedHandleOps
      Logger.warn(
        `Bundle failed': Failed handleOps sender=${failedUserOp.sender} reason=${reasonStr}`,
      )
      if (addressToBan) {
        Logger.info(`Banning address: ${addressToBan} due to failed handleOps`)
        await reputationManager.updateSeenStatus(
          failedUserOp.sender,
          'decrement',
        )
        await reputationManager.updateSeenStatus(
          failedUserOp.paymaster,
          'decrement',
        )
        await reputationManager.updateSeenStatus(
          failedUserOp.factory,
          'decrement',
        )
        await mempoolManagerBuilder.removeUserOpsForBannedAddr(addressToBan)
        await reputationManager.crashedHandleOps(addressToBan)
      } else {
        Logger.error(
          `Failed handleOps, but no entity to blame. reason=${reasonStr}`,
        )
      }

      await mempoolManagerBuilder.removeUserOp(failedUserOp)
    }
  }

  return {
    sendBundle: async (
      userOps: UserOperation[],
      _: StorageMap,
    ): Promise<SendBundleReturnWithSigner> => {
      const signerIndex = 0
      const signer = signers[signerIndex] // Default to the first signer for now
      const useBeneficiary = await selectBeneficiary(
        signer,
        providerService,
        beneficiary,
        minSignerBalance,
      )
      let crashedHandleOps: CrashedHandleOps | undefined

      try {
        // populate the transaction (e.g to, data, and value)
        const { to, data, value } =
          await entryPoint.contract.handleOps.populateTransaction(
            packUserOps(userOps),
            useBeneficiary,
          )

        const feeData = await providerService.getFeeData()
        const nonce = await signer.getNonce('pending')
        const tx: ethers.TransactionRequest = {
          to,
          data,
          value,
          from: signer.address,
          nonce,
          type: 2,
          maxFeePerGas: feeData.maxFeePerGas.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.toString(),
        }
        tx.gasLimit = await entryPoint.contract.handleOps.estimateGas(
          packUserOps(userOps),
          beneficiary,
        )

        let ret: string
        switch (txMode) {
          case 'base': {
            const respone = await signer.sendTransaction(tx)
            const receipt = await respone.wait()
            ret = receipt.hash
            break
          }
          case 'searcher': {
            const signedTx = await signer.signTransaction(tx)
            ret = await providerService.sendTransactionToFlashbots(
              signedTx,
              signer.address,
            )
            break
          }
          default:
            throw new Error(`unknown txMode: ${txMode}`)
        }

        // hashes are needed for debug rpc only.
        const hashes = await getUserOpHashes(
          userOps,
          providerService,
          entryPoint.address,
        )

        return {
          transactionHash: ret,
          userOpHashes: hashes,
          signerIndex,
          isSendBundleSuccess: true,
        } as SendBundleReturnWithSigner
      } catch (e: any) {
        Logger.debug('Failed handleOps, attempting to parse error...')
        const { opIndex, reasonStr } = parseFailedOpRevert(
          e,
          config.entryPoint.contract,
        )
        if (opIndex == null || reasonStr == null) {
          checkFatal(e)
          Logger.warn('Failed handleOps, but non-FailedOp error', e)
          return
        }

        // Find entity address that caused handleOps to fail
        const failedUserOp = userOps[opIndex]
        const addressToBan: string | undefined = await findEntityToBlame(
          reasonStr,
          failedUserOp,
          reputationManager,
          entryPoint.address,
        )

        crashedHandleOps = {
          failedUserOp,
          addressToBan,
          reasonStr,
        }

        return {
          transactionHash: '',
          userOpHashes: [],
          signerIndex,
          isSendBundleSuccess: false,
        }
      } finally {
        await afterHook(crashedHandleOps)
      }
    },
  }
}
