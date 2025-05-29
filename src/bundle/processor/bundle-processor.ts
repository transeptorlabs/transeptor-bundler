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
  EIP7702Authorization,
} from '../../types/index.js'
import { packUserOps, prepareEip7702Transaction } from '../../utils/index.js'
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
  const TX_TYPE_EIP_7702 = 4
  const TX_TYPE_EIP_1559 = 2
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
      eip7702Tuples: EIP7702Authorization[],
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
        const type =
          eip7702Tuples.length > 0 ? TX_TYPE_EIP_7702 : TX_TYPE_EIP_1559
        const feeData = await providerService.getFeeData()
        const nonce = await signer.getNonce('pending')
        const tx: ethers.TransactionRequest = {
          to,
          data,
          value,
          from: signer.address,
          nonce,
          type,
          maxFeePerGas: feeData.maxFeePerGas.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.toString(),
        }
        tx.gasLimit = await entryPoint.contract.handleOps.estimateGas(
          packUserOps(userOps),
          beneficiary,
        )

        let ret: string
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
            const res = await providerService.send<string>(
              'eth_sendRawTransaction',
              [signedEthereumJsTx],
            )

            const txHash = res.fold(
              (err) => {
                Logger.error(`Failed to send transaction: ${err.message}`, err)
                throw new Error(err.message)
              },
              (res) => {
                Logger.debug(`Transaction sent successfully: ${res}`)
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
