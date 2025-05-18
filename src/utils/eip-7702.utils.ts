import {
  ecrecover,
  pubToAddress,
  toBuffer,
  toChecksumAddress,
} from 'ethereumjs-util'

import { EIP7702Authorization, UserOperation } from '../types/index.js'
import { ethers, getBytes, hexlify, toBeHex, Wallet } from 'ethers'
import { BigNumberish } from 'ethers'
import { keccak256 } from 'ethers'
import { hexConcat } from './bundle.utils.js'
import { encodeRlp } from 'ethers'

import { ChainConfig, Common, Hardfork, Mainnet } from '@ethereumjs/common'
import { createEOACode7702Tx, EOACode7702TxData } from '@ethereumjs/tx'
import { PrefixedHexString } from '@ethereumjs/util'

// from: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-7702.md
// authority = ecrecover(keccak(MAGIC || rlp([chain_id, address, nonce])), y_parity, r, s)
// RLP: https://ethereum.org/en/developers/docs/data-structures-and-encoding/rlp/

const EIP7702_MAGIC = '0x05'
export const EIP_7702_MARKER_CODE = '0xef0100'

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
  const yParity = toBeHex(authorization.yParity)
  const r = toBuffer(toBeHex(authorization.r))
  const s = toBuffer(toBeHex(authorization.s))
  const dataToSign = toBuffer(eip7702DataToSign(authorization))
  const retRecover = pubToAddress(ecrecover(dataToSign, yParity, r, s))
  return toChecksumAddress(hexlify(new Uint8Array(retRecover)))
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

  const common = new Common({ chain, hardfork: Hardfork.Cancun, eips: [7702] })
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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    nonce: toBeHex(tx.nonce!) as PrefixedHexString,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    to: tx.to! as PrefixedHexString,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    value: '0x0',
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    data: hexlify(tx.data!) as PrefixedHexString,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    chainId: toBeHex(tx.chainId!) as PrefixedHexString,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    maxPriorityFeePerGas: toBeHex(
      tx.maxPriorityFeePerGas!,
    ) as PrefixedHexString,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    maxFeePerGas: toBeHex(tx.maxPriorityFeePerGas!) as PrefixedHexString,
    accessList: [],
    authorizationList,
  }
  txData.gasLimit = 10_000_000

  const objectTx = createEOACode7702Tx(txData, { common })
  const privateKeyBytes: Uint8Array = getBytes(signer.privateKey)

  const signedTx = objectTx.sign(privateKeyBytes)
  const encodedTx = signedTx.serialize()
  return hexlify(encodedTx)
}
