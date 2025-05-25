import { Logger } from '../logger/index.js'
import { Either } from '../monad/index.js'
import {
  ERC7562Call,
  Erc7562Parser,
  ERC7562ValidationResults,
  RpcError,
  UserOperation,
  ValidationResult,
} from 'src/types/index.js'

export const createErc7562Parser = (): Erc7562Parser => {
  return {
    parseTracerResult: (
      userOp: UserOperation,
      erc7562Call: ERC7562Call,
      validationResult: ValidationResult,
    ): Either<RpcError, ERC7562ValidationResults> => {
      Logger.info(
        { userOp, erc7562Call, validationResult },
        'erc7562TracerResultParser',
      )
      // TODO: Add erc7562TracerResultParser implementation
      return Either.Right({} as any)
    },
  }
}
