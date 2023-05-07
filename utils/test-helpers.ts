import { UserOperation } from "../src/modules/Types"

export function mockUserOperationFactory(
  sender: string,
  nonce: number
): UserOperation {
  const mockUserOperation: UserOperation = {
    sender: sender,
    nonce: nonce,
    initCode: "0x0000000",
    callData: "0x0000000",
    callGasLimit: 0,
    verificationGasLimit: 0,
    preVerificationGas: 0,
    maxFeePerGas: 0,
    maxPriorityFeePerGas: 0,
    paymasterAndData: "0x0000000",
    signature: "0x0000000",
  }
  return mockUserOperation
}

export function mockEntryPointGetUserOpHash(userOp: UserOperation): string {
  const objString = JSON.stringify(userOp)
  let hash = 0

  if (objString.length === 0) {
    return hash.toString()
  }

  for (let i = 0; i < objString.length; i++) {
    const charCode = objString.charCodeAt(i)
    hash = (hash << 5) - hash + charCode
    hash |= 0 // Convert to 32-bit integer
  }

  return hash.toString()
}
