import { ErrorDescription } from '@ethersproject/abi/lib/interface'
import { BigNumber, ContractFactory, ethers, Wallet } from 'ethers'

import {
  GET_USEROP_HASHES_ABI,
  GET_USEROP_HASHES_BYTECODE,
} from '../../../shared/abis/index.js'
import { Logger } from '../../../shared/logger/index.js'
import { MempoolManager } from '../mempool/index.js'
import { ProviderService } from '../../../shared/provider/index.js'
import {
  SendBundleReturnWithSigner,
  StorageMap,
  UserOperation,
} from '../../../shared/types/index.js'
import { packUserOps } from '../../../shared/utils/index.js'
import { ReputationManager } from '../reputation/index.js'
import { BundlerSignerWallets, createSignerService } from '../signer/index.js'

export type BundleProcessor = {
  /**
   * submit a bundle.
   * after submitting the bundle, remove all UserOps from the mempool
   *
   * @param userOps
   * @param storageMap
   * @returns SendBundleReturnWithSigner the transaction and UserOp hashes on successful transaction, or null on failed transaction
   */
  sendBundle: (
    userOps: UserOperation[],
    storageMap: StorageMap,
  ) => Promise<SendBundleReturnWithSigner>
}

export const createBundleProcessor = (
  providerService: ProviderService,
  reputationManager: ReputationManager,
  mempoolManager: MempoolManager,
  entryPointContract: ethers.Contract,
  txMode: string,
  beneficiary: string,
  minSignerBalance: BigNumber,
  signers: BundlerSignerWallets,
): BundleProcessor => {
  const ss = createSignerService(providerService)

  /**
   * Determine who should receive the proceedings of the request.
   * if signer balance is too low, send it to signer. otherwise, send to configured beneficiary.
   *
   * @param signer - the signer to check balance.
   * @returns the address of the beneficiary.
   */
  const selectBeneficiary = async (signer: Wallet): Promise<string> => {
    const currentBalance = await ss.getSignerBalance(signer)
    let beneficiaryToUse = beneficiary
    // below min-balance redeem to the signer, to keep it active.
    if (currentBalance.lte(minSignerBalance)) {
      beneficiaryToUse = await ss.getSignerAddress(signer)
      Logger.debug(
        `low balance. using, ${beneficiaryToUse}, as beneficiary instead of , ${beneficiary}`,
      )
    }
    return beneficiaryToUse
  }

  // fatal errors we know we can't recover
  const checkFatal = (e: any): void => {
    if (e.error?.code === -32601) {
      throw e
    }
  }

  const getUserOpHashes = async (
    userOps: UserOperation[],
  ): Promise<string[]> => {
    const getUserOpCodeHashesFactory = new ethers.ContractFactory(
      GET_USEROP_HASHES_ABI,
      GET_USEROP_HASHES_BYTECODE,
    ) as ContractFactory

    const { userOpHashes } = await providerService.getCodeHashes(
      getUserOpCodeHashesFactory,
      [entryPointContract.address, packUserOps(userOps)],
    )

    return userOpHashes
  }

  return {
    sendBundle: async (
      userOps: UserOperation[],
      storageMap: StorageMap,
    ): Promise<SendBundleReturnWithSigner> => {
      // TODO: use ss.getReadySigner() instead of signers[0]
      const signerIndex = 0
      const signer = signers[signerIndex]
      const beneficiary = await selectBeneficiary(signer)

      try {
        const feeData = await providerService.getFeeData()
        const tx = await entryPointContract.populateTransaction.handleOps(
          packUserOps(userOps),
          beneficiary,
          {
            type: 2,
            nonce: await ss.getTransactionCount(signer),
            gasLimit: 10e6,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? 0,
            maxFeePerGas: feeData.maxFeePerGas ?? 0,
          },
        )
        tx.chainId = await providerService.getChainId()
        const signedTx = await ss.signTransaction(tx, signer)

        let ret: string
        if (txMode === 'conditional') {
          ret = await providerService.send(
            'eth_sendRawTransactionConditional',
            [signedTx, { knownAccounts: storageMap }],
          )
          Logger.debug(
            { ret, length: userOps.length },
            'eth_sendRawTransactionConditional ret=',
          )
        } else {
          ret = await providerService.send('eth_sendRawTransaction', [signedTx])
          Logger.debug(
            { ret, length: userOps.length },
            'eth_sendRawTransaction ret=',
          )
        }

        // TODO: parse ret, and revert if needed.

        // hashes are needed for debug rpc only.
        const hashes = await getUserOpHashes(userOps)
        return {
          transactionHash: ret,
          userOpHashes: hashes,
        } as SendBundleReturnWithSigner
      } catch (e: any) {
        let parsedError: ErrorDescription
        try {
          parsedError = entryPointContract.interface.parseError(
            e.data?.data ?? e.data,
          )
        } catch (e1) {
          checkFatal(e)
          Logger.warn({ e }, 'Failed handleOps, but non-FailedOp error')
          return {
            transactionHash: '',
            userOpHashes: [],
            signerIndex,
          }
        }

        // update entity reputation staus if it cause handleOps to fail
        const { opIndex, reason } = parsedError.args
        const userOp = userOps[opIndex]
        const reasonStr: string = reason.toString()

        if (reasonStr.startsWith('AA3')) {
          reputationManager.crashedHandleOps(userOp.paymaster)
        } else if (reasonStr.startsWith('AA2')) {
          reputationManager.crashedHandleOps(userOp.sender)
        } else if (reasonStr.startsWith('AA1')) {
          reputationManager.crashedHandleOps(userOp.factory)
        }

        // remove failed UserOp from mempool
        await mempoolManager.removeUserOp(userOp)
        Logger.warn(
          `Failed handleOps sender=${userOp.sender} reason=${reasonStr}`,
        )

        return {
          transactionHash: '',
          userOpHashes: [],
          signerIndex,
        }
      }
    },
  }
}
