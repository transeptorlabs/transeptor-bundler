import { toBeHex } from 'ethers'

export const requireCond = (
  cond: boolean,
  msg: string,
  code: number,
  data: any = undefined,
): void => {
  if (!cond) {
    throw new RpcError(msg, code, data)
  }
}

export class RpcError extends Error {
  // error codes from: https://eips.ethereum.org/EIPS/eip-1474
  constructor(
    msg: string,
    readonly code: number,
    readonly data: any = undefined,
  ) {
    super(msg)
  }
}

/*
 * hexlify all members of object, recursively
 */
export const deepHexlify = (obj: any): any => {
  if (typeof obj === 'function') {
    return undefined
  }

  if (obj == null || typeof obj === 'string' || typeof obj === 'boolean') {
    return obj
  }

  if (typeof obj === 'bigint' || typeof obj === 'number') {
    return toBeHex(obj)
  }

  if (Array.isArray(obj)) {
    return obj.map((member) => deepHexlify(member))
  }

  return Object.keys(obj).reduce(
    (set, key) =>
      Object.assign(Object.assign({}, set), { [key]: deepHexlify(obj[key]) }),
    {},
  )
}
