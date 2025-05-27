export enum EVMOpcodes {
  ADDRESS = 0x30,
  BALANCE = 0x31,
  ORIGIN = 0x32,
  GASPRICE = 0x3a,
  BLOCKHASH = 0x40,
  COINBASE = 0x41,
  TIMESTAMP = 0x42,
  NUMBER = 0x43,
  DIFFICULTY = 0x44,
  GASLIMIT = 0x45,
  SELFBALANCE = 0x47,
  BASEFEE = 0x48,
  BLOBHASH = 0x49,
  BLOBBASEFEE = 0x4a,
  GAS = 0x5a,
  CREATE = 0xf0,
  SELFDESTRUCT = 0xff,
  EXTCODESIZE = 0x3b,
  EXTCODECOPY = 0x3c,
  EXTCODEHASH = 0x3f,
  CHAINID = 0x46,
  MLOAD = 0x51,
  MSTORE = 0x52,
  MSTORE8 = 0x53,
  SLOAD = 0x54,
  SSTORE = 0x55,
  JUMPDEST = 0x5b,
  TLOAD = 0x5c,
  TSTORE = 0x5d,
  MCOPY = 0x5e,
  PUSH0 = 0x5f,
  CALL = 0xf1,
  RETURN = 0xf3,
  DELEGATECALL = 0xf4,
  CREATE2 = 0xf5,
  STATICCALL = 0xfa,
  REVERT = 0xfd,
  INVALID = 0xfe,
}

/**
 * Gets the opcode name for a given opcode value.
 *
 * @param value - The opcode value to look up.
 * @returns The name of the opcode, or undefined if not found.
 */
export function getOpcodeName(value: number): string | undefined {
  return Object.entries(EVMOpcodes).find(([_, v]) => v === value)?.[0]
}
