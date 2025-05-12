import type { BigNumberish } from 'ethers'

export type EIP7702Authorization = {
  chainId: BigNumberish
  address: string
  nonce: BigNumberish
  yParity: BigNumberish
  r: BigNumberish
  s: BigNumberish
}
