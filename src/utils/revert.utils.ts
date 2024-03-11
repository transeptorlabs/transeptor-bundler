import utils from 'ethers/lib/utils'

export function decodeErrorReason(error: string) {
    const ErrorSig = (0, utils.keccak256)(Buffer.from('Error(string)')).slice(0, 10)
    const FailedOpSig = (0, utils.keccak256)(Buffer.from('FailedOp(uint256,string)')).slice(0, 10)
  
    if (error.startsWith(ErrorSig)) {
      const [message] = utils.defaultAbiCoder.decode(['string'], '0x' + error.substring(10))
      return { message }
    } else if (error.startsWith(FailedOpSig)) {
      const [opIndex, message] = utils.defaultAbiCoder.decode(['uint256', 'string'], '0x' + error.substring(10))
      const errorMessage = `FailedOp: ${message}`
      return {
        message: errorMessage,
        opIndex
      }
    }
  }