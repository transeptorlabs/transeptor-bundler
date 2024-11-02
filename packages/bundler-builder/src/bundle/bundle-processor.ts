import { ErrorDescription } from '@ethersproject/abi/lib/interface'
import { BigNumber, ContractFactory, ethers, Wallet } from 'ethers'

import {
  GET_USEROP_HASHES_ABI,
  GET_USEROP_HASHES_BYTECODE,
} from '../../../shared/abis/index.js'
import { Logger } from '../../../shared/logger/index.js'
import { ProviderService } from '../../../shared/provider/index.js'
import {
  SendBundleReturnWithSigner,
  StorageMap,
  UserOperation,
} from '../../../shared/types/index.js'
import { packUserOps } from '../../../shared/utils/index.js'
import { ReputationManagerReader } from '../reputation/index.js'
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
  reputationManager: ReputationManagerReader,
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

  const findEntityToBan = async (
    reasonStr: string,
    userOp: UserOperation,
  ): Promise<string | undefined> => {
    const isAccountStaked = async (userOp: UserOperation): Promise<boolean> => {
      const senderStakeInfo = await reputationManager.getStakeStatus(
        userOp.sender,
        entryPointContract.address,
      )
      return senderStakeInfo?.isStaked
    }

    const isFactoryStaked = async (userOp: UserOperation): Promise<boolean> => {
      const factoryStakeInfo =
        userOp.factory == null
          ? null
          : await reputationManager.getStakeStatus(
              userOp.factory,
              entryPointContract.address,
            )
      return factoryStakeInfo?.isStaked ?? false
    }

    if (reasonStr.startsWith('AA3')) {
      // [EREP-030]  A Staked Account is accountable for failures in other entities (`paymaster`, `aggregator`) even if they are staked.
      return (await isAccountStaked(userOp)) ? userOp.sender : userOp.paymaster
    } else if (reasonStr.startsWith('AA2')) {
      // [EREP-020] A staked factory is "accountable" for account breaking the rules.
      return (await isFactoryStaked(userOp)) ? userOp.factory : userOp.sender
    } else if (reasonStr.startsWith('AA1')) {
      // (can't have staked account during its creation)
      return userOp.factory
    }
    return undefined
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
        const [feeData, chainId, nonce] = await Promise.all([
          providerService.getFeeData(),
          providerService.getChainId(),
          ss.getTransactionCount(signer),
        ])

        // populate the transaction (e.g to, data, and value)
        const tx = await entryPointContract.populateTransaction.handleOps(
          packUserOps(userOps),
          beneficiary,
        )

        const signedTx = await ss.signTransaction(
          {
            ...tx,
            chainId,
            type: 2,
            nonce,
            gasLimit: BigNumber.from(10e6),
            maxPriorityFeePerGas:
              feeData.maxPriorityFeePerGas ?? BigNumber.from(0),
            maxFeePerGas: feeData.maxFeePerGas ?? BigNumber.from(0),
          },
          signer,
        )

        let ret: string
        switch (txMode) {
          case 'conditional':
            ret = await providerService.send(
              'eth_sendRawTransactionConditional',
              [signedTx, { knownAccounts: storageMap }],
            )
            break
          case 'base': {
            const respone = await signer.sendTransaction(tx)
            const receipt = await respone.wait()
            ret = receipt.transactionHash
            break
          }
          case 'searcher':
            throw new Error('searcher txMode is not supported')
          default:
            throw new Error(`unknown txMode: ${txMode}`)
        }

        // hashes are needed for debug rpc only.
        const hashes = await getUserOpHashes(userOps)
        return {
          transactionHash: ret,
          userOpHashes: hashes,
          signerIndex,
        } as SendBundleReturnWithSigner
      } catch (e: any) {
        let parsedError: ErrorDescription
        try {
          let data = e.data?.data ?? e.data
          const body = e?.error?.error?.body
          if (body != null) {
            const jsonbody = JSON.parse(body)
            data = jsonbody.error.data?.data ?? jsonbody.error.data
          }

          parsedError = entryPointContract.interface.parseError(data)
        } catch (e1) {
          checkFatal(e)
          Logger.warn({ e }, 'Failed handleOps, but non-FailedOp error')
          return {
            transactionHash: '',
            userOpHashes: [],
            signerIndex,
          }
        }

        // Find entity address that caused handleOps to fail
        const { opIndex, reason } = parsedError.args
        const userOp = userOps[opIndex]
        const reasonStr: string = reason.toString()
        const addressToban: string | undefined = await findEntityToBan(
          reasonStr,
          userOp,
        )

        Logger.warn(
          `Bundle failed': Failed handleOps sender=${userOp.sender} reason=${reasonStr}`,
        )

        return {
          transactionHash: '',
          userOpHashes: [],
          signerIndex,
          crashedHandleOps: {
            failedOp: userOp,
            addressToban,
          },
        }
      }
    },
  }
}
