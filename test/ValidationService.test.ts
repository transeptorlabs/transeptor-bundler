import '@nomiclabs/hardhat-ethers'
import { EntryPoint, EntryPoint__factory } from '@account-abstraction/contracts'
import { ValidationService } from '../src/modules/validation'
import { defaultAbiCoder, keccak256 } from 'ethers/lib/utils'
import { ethers as hardhatEthers } from 'hardhat';
import { expect } from 'chai'

describe('ValidationService', () => {
  let vs: ValidationService
  const provider = hardhatEthers.provider
  const ethersSigner = provider.getSigner()
  let entryPoint: EntryPoint

  beforeEach(async () => {
    entryPoint = await new EntryPoint__factory(ethersSigner).deploy()
    vs = new ValidationService()
  })
  
  afterEach(() => {
  })

  it('#getCodeHashes', async () => {
      const epHash = keccak256(await provider.getCode(entryPoint.address.toLowerCase()))
      const addresses = [entryPoint.address]
      const packed = defaultAbiCoder.encode(['bytes32[]'], [[epHash]])
      const packedHash = keccak256(packed)
      const result = await vs.getCodeHashes(addresses)
      expect(result.addresses).to.equal(addresses)
      expect(result.hash).to.equal(packedHash)
    })
})