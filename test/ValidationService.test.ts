import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import { DeterministicDeployer } from '@account-abstraction/sdk'
import { EntryPoint__factory } from '@account-abstraction/contracts'
import { defaultAbiCoder, keccak256 } from 'ethers/lib/utils'
import { expect } from 'chai'

import { ProviderService } from '../src/modules/provider'
import { ValidationService } from '../src/modules/validation'
import { ReputationManager } from '../src/modules/reputation'
import { testWallet } from './utils/test-helpers'
import { ENTRY_POINT_ABI } from '../src/modules/utils'
import { Logger } from '../src/modules/logger'

describe('ValidationService', () => {
  const provider = hardhatEthers.provider
  const connectedWallet = testWallet.connect(provider)

  let vs: ValidationService
  let ps: ProviderService
  let rm: ReputationManager
  let entryPointContract: ethers.Contract

  before(async () => {
    // deploy entry point
    const dep = new DeterministicDeployer(provider)
    const epAddr = DeterministicDeployer.getAddress(EntryPoint__factory.bytecode)

    if (await dep.isContractDeployed(epAddr)) {
      Logger.debug(`EntryPoint already deployed at ${epAddr}`)
    } else {
      const net = await provider.getNetwork()
      if (net.chainId !== 1337 && net.chainId !== 31337) {
        Logger.debug('NOT deploying EntryPoint. use pre-deployed entrypoint')
      } else {
        Logger.debug(`deploying entrypoint on local network: ${net.chainId}`)
        await dep.deterministicDeploy(EntryPoint__factory.bytecode)
      }
    }
    
    // ValidationService dependencies
    ps = new ProviderService(provider, connectedWallet)
    rm = new ReputationManager(BigNumber.from('1'), 84600)
    entryPointContract = new ethers.Contract(epAddr, ENTRY_POINT_ABI, connectedWallet)
  
    vs = new ValidationService(ps, rm, entryPointContract, true)
  })
  

  it('#getCodeHashes', async () => {
    const epHash = keccak256(await provider.getCode(entryPointContract.address.toLowerCase()))
    const addresses = [entryPointContract.address]
    const packed = defaultAbiCoder.encode(['bytes32[]'], [[epHash]])
    const packedHash = keccak256(packed)
    const result = await vs.getCodeHashes(addresses)
    expect(result.addresses).to.eq(addresses)
    expect(result.hash).to.eq(packedHash)
  })
})