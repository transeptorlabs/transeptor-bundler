import { ChainConfig, Common, Hardfork, Mainnet } from '@ethereumjs/common'
import { createEOACode7702Tx, EOACode7702TxData } from '@ethereumjs/tx'
import { PrefixedHexString } from '@ethereumjs/util'
import {
  BigNumberish,
  keccak256,
  encodeRlp,
  ethers,
  getBytes,
  hexlify,
  recoverAddress,
  toBeHex,
  Wallet,
} from 'ethers'

import { EIP7702_MAGIC } from '../constants/index.js'
import { EIP7702Authorization, UserOperation } from '../types/index.js'

import { hexConcat } from './common.utils.js'

// from: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-7702.md
// authority = ecrecover(keccak(MAGIC || rlp([chain_id, address, nonce])), y_parity, r, s)
// RLP: https://ethereum.org/en/developers/docs/data-structures-and-encoding/rlp/

export type UnsignedEIP7702Authorization = {
  chainId: BigNumberish
  address: string
  nonce?: BigNumberish
}

export const getAuthorizationList = (
  userOp: UserOperation,
): EIP7702Authorization[] => {
  return userOp.eip7702Auth != null ? [userOp.eip7702Auth] : []
}

export const toRlpHex = (s: any): PrefixedHexString => {
  if (typeof s === 'bigint' || typeof s === 'number') {
    s = toBeHex(BigInt(s))
  }
  let ret = s.replace(/0x0*/, '0x')
  // make sure hex string is not odd-length
  if (ret.length % 2 === 1) {
    ret = ret.replace('0x', '0x0')
  }
  return ret as PrefixedHexString
}

export const eip7702DataToSign = (
  authorization: UnsignedEIP7702Authorization,
): PrefixedHexString => {
  const rlpData = [
    toRlpHex(authorization.chainId),
    toRlpHex(authorization.address),
    toRlpHex(authorization.nonce),
  ]
  return keccak256(
    hexConcat([EIP7702_MAGIC, encodeRlp(rlpData)]),
  ) as PrefixedHexString
}

export const getEip7702AuthorizationSigner = (
  authorization: EIP7702Authorization,
): string => {
  const rawYParity = Number(authorization.yParity)
  const yParity = (rawYParity >= 27 ? rawYParity - 27 : rawYParity) as 0 | 1
  return recoverAddress(eip7702DataToSign(authorization), {
    r: toBeHex(authorization.r, 32),
    s: toBeHex(authorization.s, 32),
    yParity,
  })
}

// TODO: Replace @ethereumjs with ethers.js when it supports EIP-7702
// ethers(7702): https://github.com/ethers-io/ethers.js/issues/4916
// @ethereumjs(7702): https://github.com/ethereumjs/ethereumjs-monorepo/tree/master/packages/tx#eoa-code-transaction-eip-7702
export const prepareEip7702Transaction = async (
  tx: ethers.TransactionRequest,
  eip7702Tuples: EIP7702Authorization[],
  signer: Wallet,
): Promise<string> => {
  const chain: ChainConfig = {
    bootstrapNodes: [],
    defaultHardfork: Hardfork.Prague,
    hardforks: Mainnet.hardforks,
    consensus: undefined,
    genesis: undefined,
    name: '',
    chainId: 1337,
  }

  const common = new Common({ chain, eips: [2718, 2929, 2930, 7702] })
  const authorizationList = eip7702Tuples.map((it) => {
    return {
      chainId: toRlpHex(it.chainId) as PrefixedHexString,
      address: toRlpHex(it.address) as PrefixedHexString,
      nonce: toRlpHex(it.nonce) as PrefixedHexString,
      yParity: toRlpHex(it.yParity) as PrefixedHexString,
      r: toRlpHex(it.r) as PrefixedHexString,
      s: toRlpHex(it.s) as PrefixedHexString,
    }
  })

  const txData: EOACode7702TxData = {
    nonce: toBeHex(tx.nonce!) as PrefixedHexString,
    to: tx.to! as PrefixedHexString,
    value: '0x0',
    data: hexlify(tx.data!) as PrefixedHexString,
    chainId: toBeHex(tx.chainId!) as PrefixedHexString,
    maxPriorityFeePerGas: toBeHex(
      tx.maxPriorityFeePerGas!,
    ) as PrefixedHexString,
    maxFeePerGas: toBeHex(tx.maxFeePerGas!) as PrefixedHexString,
    gasLimit: toBeHex(10_000_000) as PrefixedHexString,
    accessList: [],
    authorizationList,
  }

  const objectTx = createEOACode7702Tx(txData, { common })
  const privateKeyBytes: Uint8Array = getBytes(signer.privateKey)

  const signedTx = objectTx.sign(privateKeyBytes)
  const encodedTx = signedTx.serialize()
  return hexlify(encodedTx)
}
