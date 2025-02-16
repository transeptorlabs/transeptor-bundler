import { toBeHex } from 'ethers'
import { RpcError } from '../types/index.js'

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
    return toBeHex(obj).replace(/^0x0/, '0x')
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
