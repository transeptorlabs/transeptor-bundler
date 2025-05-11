import { ErrorDescription, ethers } from 'ethers'
import { Logger } from '../../logger/index.js'
import { ProviderService } from '../../provider/index.js'
import {
  SendBundleReturnWithSigner,
  StorageMap,
  UserOperation,
  ReputationManagerReader,
  BundlerSignerWallets,
  MempoolManagerBuilder,
  ReputationManagerUpdater,
  BundleProcessor,
  CrashedHandleOps,
} from '../../types/index.js'
import { packUserOps } from '../../utils/index.js'
import {
  getUserOpHashes,
  parseError,
  selectBeneficiary,
} from './processor-helpers.js'
import { findEntityToBlame } from '../bundle.helper.js'

export type BundleProcessorConfig = {
  providerService: ProviderService
  reputationManager: ReputationManagerReader
  mempoolManagerBuilder: MempoolManagerBuilder
  reputationManagerUpdater: ReputationManagerUpdater
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
    reputationManagerUpdater,
    entryPoint,
    txMode,
    beneficiary,
    minSignerBalance,
    signers,
  } = config
  const afterHook = async (crashedHandleOps: CrashedHandleOps | undefined) => {
    Logger.debug('After hook running for bundle processor')
    // Update reputation status to ban and drop userOp from mempool for entity that caused handleOps to revert
    if (crashedHandleOps) {
      const { addressToBan, failedOp } = crashedHandleOps
      if (addressToBan) {
        Logger.info(`Banning address: ${addressToBan} due to failed handleOps`)
        await mempoolManagerBuilder.removeUserOpsForBannedAddr(addressToBan)
        await reputationManagerUpdater.crashedHandleOps(addressToBan)
      }

      await mempoolManagerBuilder.removeUserOp(failedOp)
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
        const parsedError: ErrorDescription | undefined = parseError(
          e,
          entryPoint.contract,
        )
        if (!parsedError) {
          return {
            transactionHash: '',
            userOpHashes: [],
            signerIndex,
            isSendBundleSuccess: false,
          }
        }

        // Find entity address that caused handleOps to fail
        const { opIndex, reason } = parsedError.args
        const userOp = userOps[opIndex]
        const reasonStr: string = reason.toString()
        const addressToBan: string | undefined = await findEntityToBlame(
          reasonStr,
          userOp,
          reputationManager,
          entryPoint.address,
        )

        Logger.warn(
          `Bundle failed': Failed handleOps sender=${userOp.sender} reason=${reasonStr}`,
        )
        crashedHandleOps = {
          failedOp: userOp,
          addressToBan,
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
