import { ContractFactory, ErrorDescription, ethers, Wallet } from 'ethers'

import {
  GET_USEROP_HASHES_ABI,
  GET_USEROP_HASHES_BYTECODE,
} from '../abis/index.js'
import { Logger } from '../logger/index.js'
import { ProviderService } from '../provider/index.js'
import {
  SendBundleReturnWithSigner,
  StorageMap,
  UserOperation,
} from '../types/index.js'
import { packUserOps } from '../utils/index.js'
import { ReputationManagerReader } from '../reputation/index.js'
import { BundlerSignerWallets } from '../signer/index.js'

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
  minSignerBalance: bigint,
  signers: BundlerSignerWallets,
): BundleProcessor => {
  /**
   * Determine who should receive the proceedings of the request.
   * if signer balance is too low, send it to signer. otherwise, send to configured beneficiary.
   *
   * @param signer - the signer to check balance.
   * @returns the address of the beneficiary.
   */
  const selectBeneficiary = async (signer: Wallet): Promise<string> => {
    const currentBalance = await providerService.getBalance(signer.address)
    let beneficiaryToUse = beneficiary
    // below min-balance redeem to the signer, to keep it active.
    if (currentBalance <= minSignerBalance) {
      beneficiaryToUse = await signer.getAddress()
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

    const epAddress = await entryPointContract.getAddress()
    const { userOpHashes } = await providerService.runContractScript(
      getUserOpCodeHashesFactory,
      [epAddress, packUserOps(userOps)],
    )

    return userOpHashes
  }

  const findEntityToBan = async (
    reasonStr: string,
    userOp: UserOperation,
  ): Promise<string | undefined> => {
    const isAccountStaked = async (userOp: UserOperation): Promise<boolean> => {
      const epAddress = await entryPointContract.getAddress()
      const senderStakeInfo = await reputationManager.getStakeStatus(
        userOp.sender,
        epAddress,
      )
      return senderStakeInfo?.isStaked
    }

    const isFactoryStaked = async (userOp: UserOperation): Promise<boolean> => {
      const epAddress = await entryPointContract.getAddress()
      const factoryStakeInfo =
        userOp.factory == null
          ? null
          : await reputationManager.getStakeStatus(userOp.factory, epAddress)
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
      _: StorageMap,
    ): Promise<SendBundleReturnWithSigner> => {
      const signerIndex = 0
      const signer = signers[signerIndex] // Default to the first signer for now
      const beneficiary = await selectBeneficiary(signer)

      try {
        // populate the transaction (e.g to, data, and value)
        const tx = await entryPointContract.handleOps.populateTransaction(
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
            await providerService.sendBundleFlashbots(signer, tx)
            break
          }
          default:
            throw new Error(`unknown txMode: ${txMode}`)
        }

        // hashes are needed for debug rpc only.
        const hashes = await getUserOpHashes(userOps).catch((e) => {
          Logger.warn(
            { e },
            'Failed to get userOpHashes, but bundle was sent successfully',
          )
          return []
        })
        return {
          transactionHash: ret,
          userOpHashes: hashes,
          signerIndex,
        } as SendBundleReturnWithSigner
      } catch (e: any) {
        Logger.debug('Failed handleOps, attempting to parse error...')
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
          Logger.warn(
            { e, e1 },
            'Failed handleOps(could not parse error), but non-FailedOp error',
          )
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
