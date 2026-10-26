import {
  getAddress,
  hashAuthorization,
  Transaction,
  Wallet,
  type TransactionRequest,
} from 'ethers'
import { describe, expect, it } from 'vitest'

import type {
  EIP7702Authorization,
  UserOperation,
} from '../../src/types/index.js'
import {
  eip7702DataToSign,
  getAuthorizationList,
  getEip7702AuthorizationSigner,
  prepareEip7702Transaction,
  toRlpHex,
} from '../../src/utils/eip-7702.utils.js'

const DELEGATE = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
const OTHER_DELEGATE = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
const ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
const AUTHORITY_KEY =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
const OTHER_AUTHORITY_KEY =
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'
const BUNDLER_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

// prepareEip7702Transaction builds @ethereumjs Common with this chain id.
const SUPPORTED_TX_CHAIN_ID = 1337
const FORCED_GAS_LIMIT = 10_000_000n

const authority = new Wallet(AUTHORITY_KEY)
const otherAuthority = new Wallet(OTHER_AUTHORITY_KEY)
const bundler = new Wallet(BUNDLER_KEY)

const signAuthorization = (
  signer: Wallet,
  request: {
    address: string
    chainId: number | bigint
    nonce: number | bigint
  },
): EIP7702Authorization => {
  const signed = signer.authorizeSync(request)
  return {
    chainId: signed.chainId,
    address: signed.address,
    nonce: signed.nonce,
    yParity: signed.signature.yParity,
    r: signed.signature.r,
    s: signed.signature.s,
  }
}

const bundleTx = (
  overrides: Partial<TransactionRequest> = {},
): TransactionRequest => ({
  nonce: 4,
  to: ENTRY_POINT,
  data: '0xabcdef01',
  chainId: SUPPORTED_TX_CHAIN_ID,
  maxPriorityFeePerGas: '1000000000',
  maxFeePerGas: 2_000_000_000n,
  value: 123,
  gasLimit: 21_000,
  ...overrides,
})

describe('getAuthorizationList', () => {
  it('returns an empty list when the user operation has no authorization', () => {
    expect(getAuthorizationList({} as UserOperation)).toEqual([])
    expect(
      getAuthorizationList({ eip7702Auth: undefined } as UserOperation),
    ).toEqual([])
  })

  it('returns the authorization when the user operation carries one', () => {
    const eip7702Auth = signAuthorization(authority, {
      address: DELEGATE,
      chainId: 1,
      nonce: 5,
    })
    const userOp = { eip7702Auth } as UserOperation

    expect(getAuthorizationList(userOp)).toEqual([eip7702Auth])
  })
})

describe('toRlpHex', () => {
  it('encodes numbers with leading zeros removed and an even length', () => {
    expect(toRlpHex(0)).toBe('0x')
    expect(toRlpHex(1)).toBe('0x01')
    expect(toRlpHex(16)).toBe('0x10')
    expect(toRlpHex(255)).toBe('0xff')
    expect(toRlpHex(256)).toBe('0x0100')
    expect(toRlpHex(1337)).toBe('0x0539')
  })

  it('encodes bigints the same way as numbers', () => {
    expect(toRlpHex(0n)).toBe('0x')
    expect(toRlpHex(1n)).toBe('0x01')
    expect(toRlpHex(1337n)).toBe('0x0539')
  })

  it('normalizes hex strings that already include a 0x prefix', () => {
    expect(toRlpHex('0x10')).toBe('0x10')
    expect(toRlpHex('0x1234')).toBe('0x1234')
    expect(toRlpHex('0x01')).toBe('0x01')
    expect(toRlpHex('0x00')).toBe('0x')
    expect(toRlpHex('0x0')).toBe('0x')
    expect(toRlpHex('0x0010')).toBe('0x10')
    expect(toRlpHex('0x0001')).toBe('0x01')
    expect(toRlpHex('0x0123')).toBe('0x0123')
    expect(toRlpHex('0x123')).toBe('0x0123')
    expect(toRlpHex('0x0000000000000000000000000000000000000001')).toBe('0x01')
  })
})

describe('eip7702DataToSign', () => {
  it('matches the EIP-7702 authorization digest', () => {
    const authorization = {
      chainId: 1,
      address: DELEGATE,
      nonce: 5,
    }

    expect(eip7702DataToSign(authorization)).toBe(
      hashAuthorization(authorization),
    )
  })

  it('matches the digest for a zero chain id and nonce', () => {
    const authorization = {
      chainId: 0,
      address: DELEGATE,
      nonce: 0,
    }

    expect(eip7702DataToSign(authorization)).toBe(
      hashAuthorization(authorization),
    )
  })

  it('accepts bigint and hex inputs that encode to the same bytes', () => {
    const fromNumbers = eip7702DataToSign({
      chainId: 1337,
      address: DELEGATE,
      nonce: 256,
    })
    const fromBigints = eip7702DataToSign({
      chainId: 1337n,
      address: getAddress(DELEGATE),
      nonce: 256n,
    })
    const fromHex = eip7702DataToSign({
      chainId: '0x0539',
      address: DELEGATE.toLowerCase(),
      nonce: '0x0100',
    })

    expect(fromBigints).toBe(fromNumbers)
    expect(fromHex).toBe(fromNumbers)
    expect(fromNumbers).toBe(
      hashAuthorization({
        chainId: 1337,
        address: DELEGATE,
        nonce: 256,
      }),
    )
  })
})

describe('getEip7702AuthorizationSigner', () => {
  const authorization = signAuthorization(authority, {
    address: DELEGATE,
    chainId: 1,
    nonce: 9,
  })

  it('recovers the authority from yParity 0 or 1', () => {
    expect(getEip7702AuthorizationSigner(authorization)).toBe(authority.address)
  })

  it('recovers the authority when yParity is the legacy v value', () => {
    const v = Number(authorization.yParity) + 27

    expect(
      getEip7702AuthorizationSigner({
        ...authorization,
        yParity: v,
      }),
    ).toBe(authority.address)
    expect(
      getEip7702AuthorizationSigner({
        ...authorization,
        yParity: `0x${v.toString(16)}`,
      }),
    ).toBe(authority.address)
    expect(
      getEip7702AuthorizationSigner({
        ...authorization,
        yParity: v.toString(),
      }),
    ).toBe(authority.address)
  })

  it('recovers the authority when the signature fields are bigints', () => {
    expect(
      getEip7702AuthorizationSigner({
        ...authorization,
        yParity: BigInt(authorization.yParity),
        r: BigInt(authorization.r),
        s: BigInt(authorization.s),
      }),
    ).toBe(authority.address)
  })
})

describe('prepareEip7702Transaction', () => {
  it('signs a type-4 transaction and keeps the authorization', async () => {
    const authorization = signAuthorization(authority, {
      address: DELEGATE,
      chainId: 1,
      nonce: 5,
    })

    const raw = await prepareEip7702Transaction(
      bundleTx(),
      [authorization],
      bundler,
    )
    const parsed = Transaction.from(raw)

    expect(raw.startsWith('0x04')).toBe(true)
    expect(parsed.type).toBe(4)
    expect(parsed.from).toBe(bundler.address)
    expect(parsed.chainId).toBe(BigInt(SUPPORTED_TX_CHAIN_ID))
    expect(parsed.nonce).toBe(4)
    expect(parsed.to).toBe(getAddress(ENTRY_POINT))
    expect(parsed.value).toBe(0n)
    expect(parsed.data).toBe('0xabcdef01')
    expect(parsed.maxPriorityFeePerGas).toBe(1_000_000_000n)
    expect(parsed.maxFeePerGas).toBe(2_000_000_000n)
    expect(parsed.gasLimit).toBe(FORCED_GAS_LIMIT)
    expect(parsed.accessList).toEqual([])

    const [parsedAuth] = parsed.authorizationList ?? []
    expect(parsedAuth.address).toBe(getAddress(DELEGATE))
    expect(parsedAuth.chainId).toBe(1n)
    expect(parsedAuth.nonce).toBe(5n)
    expect(parsedAuth.signature.yParity).toBe(Number(authorization.yParity))
    expect(BigInt(parsedAuth.signature.r)).toBe(BigInt(authorization.r))
    expect(BigInt(parsedAuth.signature.s)).toBe(BigInt(authorization.s))
  })

  it('rejects an empty authorization list', async () => {
    await expect(
      prepareEip7702Transaction(bundleTx(), [], bundler),
    ).rejects.toThrow(/authorization list is empty/i)
  })

  it('preserves authorization order', async () => {
    const first = signAuthorization(authority, {
      address: DELEGATE,
      chainId: 0,
      nonce: 1,
    })
    const second = signAuthorization(otherAuthority, {
      address: OTHER_DELEGATE,
      chainId: SUPPORTED_TX_CHAIN_ID,
      nonce: 2,
    })

    const raw = await prepareEip7702Transaction(
      bundleTx({ nonce: 8, data: '0x' }),
      [first, second],
      bundler,
    )
    const parsed = Transaction.from(raw)
    const authorizations = parsed.authorizationList ?? []

    expect(authorizations).toHaveLength(2)
    expect(authorizations[0].address).toBe(getAddress(DELEGATE))
    expect(authorizations[0].chainId).toBe(0n)
    expect(authorizations[0].nonce).toBe(1n)
    expect(getEip7702AuthorizationSigner(first)).toBe(authority.address)
    expect(authorizations[1].address).toBe(getAddress(OTHER_DELEGATE))
    expect(authorizations[1].chainId).toBe(BigInt(SUPPORTED_TX_CHAIN_ID))
    expect(authorizations[1].nonce).toBe(2n)
    expect(getEip7702AuthorizationSigner(second)).toBe(otherAuthority.address)
    expect(parsed.data).toBe('0x')
    expect(parsed.nonce).toBe(8)
  })

  it('rejects a transaction chain id other than the configured common chain', async () => {
    await expect(
      prepareEip7702Transaction(bundleTx({ chainId: 1 }), [], bundler),
    ).rejects.toThrow(/chain ID/i)
  })
})
