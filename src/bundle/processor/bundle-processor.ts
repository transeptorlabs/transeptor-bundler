import { ethers } from 'ethers'

import { ProviderService } from '../../provider/index.js'
import {
  SendBundleReturnWithSigner,
  StorageMap,
  UserOperation,
  MempoolManagerBuilder,
  BundleProcessor,
  CrashedHandleOps,
  ReputationManager,
  EIP7702Authorization,
  NonFatalSendBundleFailDetails,
  TranseptorLogger,
  LogUserOpLifecycleEvent,
  LifecycleStage,
} from '../../types/index.js'
import {
  packUserOps,
  prepareEip7702Transaction,
  withReadonly,
} from '../../utils/index.js'
import { parseFailedOpRevert } from '../builder/builder.helpers.js'
import { findEntityToBlame, checkFatal } from '../bundle.helper.js'

import { getUserOpHashes, selectBeneficiary } from './processor.helpers.js'

export type BundleProcessorConfig = {
  logUserOpLifecycleEvent: LogUserOpLifecycleEvent
  providerService: ProviderService
  reputationManager: ReputationManager
  mempoolManagerBuilder: MempoolManagerBuilder
  txMode: string
  beneficiary: string
  minSignerBalance: bigint
  logger: TranseptorLogger
  chainId: number
}

/**
 * Creates an instance of the BundleProcessor module.
 *
 * @param config - The configuration object for the BundleProcessor instance.
 * @returns An instance of the BundleProcessor module.
 */
function _createBundleProcessor(
  config: Readonly<BundleProcessorConfig>,
): BundleProcessor {
  const TX_TYPE_EIP_7702 = 4
  const TX_TYPE_EIP_1559 = 2
  const {
    providerService,
    reputationManager,
    mempoolManagerBuilder,
    txMode,
    beneficiary,
    minSignerBalance,
    logger,
    logUserOpLifecycleEvent,
    chainId,
  } = config
  const entryPoint = providerService.getEntryPointContractDetails()
  const signers = providerService.getBundlerSignerWallets()

  const afterHook = async (
    crashedHandleOps: CrashedHandleOps | undefined,
    nonFatalSendBundleFailDetails: NonFatalSendBundleFailDetails | undefined,
  ) => {
    logger.debug('After hook running for bundle processor')
    if (crashedHandleOps) {
      const { failedUserOp, reasonStr, addressToBan } = crashedHandleOps
      logger.warn(
        `Bundle failed: Crashed handleOps sender=${failedUserOp.sender} reason=${reasonStr}`,
      )
      if (addressToBan) {
        logger.info(
          `Banning address: ${addressToBan} due to crashing handleOps`,
        )
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
        logger.error(
          `Crashed handleOps, but no entity to blame. reason=${reasonStr}`,
        )
      }

      await mempoolManagerBuilder.removeUserOp(failedUserOp)
    }

    if (nonFatalSendBundleFailDetails) {
      logger.warn(
        nonFatalSendBundleFailDetails,
        'Bundle failed: non-FailedOp error, sending userOps back to mempool with status of pending',
      )
      for (const userOp of nonFatalSendBundleFailDetails.userOps) {
        await mempoolManagerBuilder.updateEntryStatus(userOp, 'pending')
      }
    }
  }

  const handleAuditTrail = async (
    userOpsInBundler: {
      userOp: UserOperation
      userOpHash: string
      lifecycleStage: LifecycleStage
    }[],
  ) => {
    for (const userOpDetails of userOpsInBundler) {
      const { userOp, userOpHash, lifecycleStage } = userOpDetails
      switch (lifecycleStage) {
        case 'userOpSubmittedOnChain': {
          await logUserOpLifecycleEvent({
            lifecycleStage,
            chainId,
            userOpHash,
            entryPoint: entryPoint.address,
            userOp,
          })
          break
        }
        default: {
          break
        }
      }
    }
  }

  return {
    sendBundle: async (
      userOps: UserOperation[],
      eip7702Tuples: EIP7702Authorization[],
      _: StorageMap,
    ): Promise<SendBundleReturnWithSigner> => {
      logger.debug(
        { length: userOps.length, eip7702TuplesLength: eip7702Tuples.length },
        'Attempting to send bundle',
      )
      const signerIndex = 0
      const signer = signers[signerIndex] // Default to the first signer for now
      const useBeneficiary = await selectBeneficiary(
        signer,
        providerService,
        beneficiary,
        minSignerBalance,
      )
      let crashedHandleOps: CrashedHandleOps | undefined
      let nonFatalSendBundleFailDetails:
        | NonFatalSendBundleFailDetails
        | undefined

      try {
        // populate the transaction (e.g to, data, and value)
        const { to, data, value } =
          await entryPoint.contract.handleOps.populateTransaction(
            packUserOps(userOps),
            useBeneficiary,
          )
        const type =
          eip7702Tuples.length > 0 ? TX_TYPE_EIP_7702 : TX_TYPE_EIP_1559
        const feeData = await providerService.getFeeData()
        const nonce = await signer.getNonce('pending')
        const chainId = await providerService.getChainId()
        const tx: ethers.TransactionRequest = {
          chainId,
          to,
          data,
          value,
          from: signer.address,
          nonce,
          type,
          maxFeePerGas: feeData.maxFeePerGas.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.toString(),
        }
        if (type === TX_TYPE_EIP_1559) {
          tx.gasLimit = await entryPoint.contract.handleOps.estimateGas(
            packUserOps(userOps),
            beneficiary,
          )
        }

        let ret: string
        logger.debug(
          `Sending bundle transaction with type: ${type}, txMode: ${txMode}`,
        )
        switch (`${txMode}-${type}`) {
          case 'base-2': {
            const respone = await signer.sendTransaction(tx)
            const receipt = await respone.wait()
            ret = receipt.hash
            break
          }
          case 'base-4': {
            const signedEthereumJsTx = await prepareEip7702Transaction(
              tx,
              eip7702Tuples,
              signer,
            )
            logger.debug({
              signedEthereumJsTx,
              message: '7702 transaction prepared',
            })
            const res = await providerService.send<string>(
              'eth_sendRawTransaction',
              [signedEthereumJsTx],
            )

            const txHash = res.fold(
              (err) => {
                logger.error(`Failed to send transaction: ${err.message}`, err)
                throw new Error(err.message)
              },
              (res) => {
                logger.debug(`Transaction sent successfully: ${res}`)
                return res
              },
            )

            const receipt = await providerService.getTransactionReceipt(txHash)
            ret = receipt.hash
            break
          }
          case 'searcher-2': {
            const signedTx = await signer.signTransaction(tx)
            ret = await providerService.sendTransactionToFlashbots(
              signedTx,
              signer.address,
            )
            break
          }
          case 'searcher-4': {
            const signedEthereumJsTx = await prepareEip7702Transaction(
              tx,
              eip7702Tuples,
              signer,
            )
            ret = await providerService.sendTransactionToFlashbots(
              signedEthereumJsTx,
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

        await handleAuditTrail(
          userOps.map((userOp, index) => ({
            userOp,
            userOpHash: hashes[index],
            lifecycleStage: 'userOpSubmittedOnChain',
          })),
        )

        return {
          transactionHash: ret,
          userOpHashes: hashes,
          signerIndex,
          isSendBundleSuccess: true,
        }
      } catch (e: any) {
        logger.debug('Failed send bundle, attempting to parse error...')
        const { opIndex, reasonStr } = parseFailedOpRevert(
          e,
          entryPoint.contract,
        )
        if (opIndex == null || reasonStr == null) {
          checkFatal(e)
          nonFatalSendBundleFailDetails = {
            userOps,
            error: e,
          }
          return {
            transactionHash: '',
            userOpHashes: [],
            signerIndex,
            isSendBundleSuccess: false,
          }
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
        await afterHook(crashedHandleOps, nonFatalSendBundleFailDetails)
      }
    },
  }
}

export const createBundleProcessor = withReadonly<
  BundleProcessorConfig,
  BundleProcessor
>(_createBundleProcessor)
