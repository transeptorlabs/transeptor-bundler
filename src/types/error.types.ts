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

export class NetworkCallError extends Error {
  constructor(
    msg: string,
    readonly payload: any,
  ) {
    super(msg)
  }
}
