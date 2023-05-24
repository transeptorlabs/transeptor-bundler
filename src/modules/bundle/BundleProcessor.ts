import { BigNumber } from 'ethers'
import { MempoolEntry, ReputationStatus, StorageMap, UserOperation, ValidateUserOpResult } from '../types'
import { MempoolManager } from '../mempool'
import { getAddr, mergeStorageMap } from '../utils'
import { Config } from '../config'
import { ReputationManager } from '../reputation'
import { ProviderService } from '../provider'
import { ValidationService } from '../validation'

/*
  BundleProcessor: This class will attempt to process(send) userOperations as bundles
*/
export class BundleProcessor {
    private readonly providerService: ProviderService = new ProviderService()
    private readonly validationService: ValidationService = new ValidationService()

    constructor() {
        //
    }

    /*
      submit a bundle. After submitting the bundle, remove the remove UserOps from the mempool 
    */
    async sendNextBundle (entries: MempoolEntry[]): Promise<string> {
        console.log('sendNextBundle:', entries.length, entries)
        const [bundle, storageMap] = await this.createBundle(entries)

        return 'transactionHash'
    }
    
    private async createBundle(entries: MempoolEntry[]): Promise<[UserOperation[], StorageMap]>  {
        const bundle: UserOperation[] = []
        const storageMap: StorageMap = {}
        let totalGas = BigNumber.from(0)

        // paymaster deposit should be enough for all UserOps in the bundle.
        const paymasterDeposit: { [paymaster: string]: BigNumber } = {}
        // throttled paymasters and deployers are allowed only small UserOps per bundle.
        const stakedEntityCount: { [addr: string]: number } = {}
        // each sender is allowed only once per bundle
        const senders = new Set<string>()

        for (const entry of entries) {
            const paymaster = getAddr(entry.userOp.paymasterAndData)
            const factory = getAddr(entry.userOp.initCode)
            const paymasterStatus = ReputationManager.getStatus(paymaster)
            const deployerStatus = ReputationManager.getStatus(factory)

            // check entry reputation status
            if (paymasterStatus === ReputationStatus.BANNED || deployerStatus === ReputationStatus.BANNED) {
              MempoolManager.removeUserOp(entry.userOpHash)
              continue
            }

            if (paymaster != null && (paymasterStatus === ReputationStatus.THROTTLED ?? (stakedEntityCount[paymaster] ?? 0) > 1)) {
              console.log('skipping throttled paymaster', entry.userOp.sender, entry.userOp.nonce)
              continue
            }

            if (factory != null && (deployerStatus === ReputationStatus.THROTTLED ?? (stakedEntityCount[factory] ?? 0) > 1)) {
              console.log('skipping throttled factory', entry.userOp.sender, entry.userOp.nonce)
              continue
            }

            if (senders.has(entry.userOp.sender)) {
              console.log('skipping already included sender', entry.userOp.sender, entry.userOp.nonce)
              // allow only a single UserOp per sender per bundle
              continue
            }

            // validate UserOp and remove from mempool if failed
            let validationResult: ValidateUserOpResult
            try {
              // re-validate UserOp. no need to check stake, since it cannot be reduced between first and 2nd validation
              validationResult = await this.validationService.validateUserOp(entry.userOp, entry.referencedContracts, false)
            } catch (e: any) {
              console.log('failed 2nd validation:', e.message)
              // failed validation. don't try anymore
              MempoolManager.removeUserOp(entry.userOpHash)
              continue
            }

            // TODO: we take UserOp's callGasLimit, even though it will probably require less (but we don't
            // attempt to estimate it to check)
            // which means we could "cram" more UserOps into a bundle.
            const userOpGasCost = BigNumber.from(validationResult.returnInfo.preOpGas).add(entry.userOp.callGasLimit)
            const newTotalGas = totalGas.add(userOpGasCost)
            if (newTotalGas.gt(Config.maxBundleGas)) {
              break
            }
      
            if (paymaster != null) {
              if (paymasterDeposit[paymaster] == null) {
                paymasterDeposit[paymaster] = await Config.entryPointContract.balanceOf(paymaster)
              }
              if (paymasterDeposit[paymaster].lt(validationResult.returnInfo.prefund)) {
                // not enough balance in paymaster to pay for all UserOps
                // (but it passed validation, so it can sponsor them separately
                continue
              }
              stakedEntityCount[paymaster] = (stakedEntityCount[paymaster] ?? 0) + 1
              paymasterDeposit[paymaster] = paymasterDeposit[paymaster].sub(validationResult.returnInfo.prefund)
            }

            if (factory != null) {
              stakedEntityCount[factory] = (stakedEntityCount[factory] ?? 0) + 1
            }
      
            // If sender's account already exist: replace with its storage root hash
            if (Config.isConditionalTxMode() && entry.userOp.initCode.length <= 2) {
                // in conditionalRpc: always put root hash (not specific storage slots) for "sender" entries
                const { storageHash } = await this.providerService.send('eth_getProof', [entry.userOp.sender, [], 'latest'])
                storageMap[entry.userOp.sender.toLowerCase()] = storageHash
            }
            mergeStorageMap(storageMap, validationResult.storageMap)
      
            senders.add(entry.userOp.sender)
            bundle.push(entry.userOp)
            totalGas = newTotalGas
          }

        return [bundle, storageMap]
    }

}