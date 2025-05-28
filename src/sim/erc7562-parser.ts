/* eslint-disable complexity */
import { ethers, FunctionFragment, Interface, keccak256 } from 'ethers'
import { Logger } from '../logger/index.js'
import { Either } from '../monad/index.js'
import {
  AccountAbstractionEntity,
  ERC7562Call,
  Erc7562Parser,
  ERC7562Rule,
  ERC7562ValidationResults,
  ERC7562Violation,
  RpcError,
  SlotMap,
  StakeInfo,
  StorageMap,
  UserOperation,
  ValidationErrors,
  ValidationResult,
} from '../types/index.js'
import { getOpcodeName } from './evm-opcodes.js'
import {
  bannedOpCodes,
  opcodesOnlyInStakedEntities,
} from './erc7562-banned-opcodes.js'
import {
  IACCOUNT_ABI,
  IENTRY_POINT_ABI,
  IPAYMASTER_ABI,
  SENDER_CREATOR_ABI,
} from '../abis/index.js'
import { get4bytes } from './sim.helper.js'
import { toBytes32 } from '../utils/index.js'

type Erc7562ParserConfig = {
  entryPointAddress: string
  senderCreatorAddress: string
}

type Erc7562ParserRunnerState = {
  keccak: string[]
  ruleViolations: ERC7562Violation[]
  currentEntity: AccountAbstractionEntity
  currentEntityAddress: string
  contractAddresses: string[]
  storageMap: StorageMap
  delegatecallStorageAddress: string
  recursionDepth: number
  readonly validationResult: ValidationResult
  readonly userOp: UserOperation
  readonly erc7562Call: ERC7562Call
}

export const createErc7562Parser = (
  config: Erc7562ParserConfig,
): Erc7562Parser => {
  const entryPointAddress = config.entryPointAddress.toLowerCase()
  const senderCreatorAddress = config.senderCreatorAddress.toLowerCase()

  /**
   * Removes duplicate names from the ABI interfaces.
   * This is necessary because some ABIs may have multiple entries with the same name.
   *
   * @param arr - The array of ABI interfaces to process.
   * @returns An array of unique ABI interfaces.
   */
  function uniqueNames(arr: any[]): any[] {
    const map = new Map()
    for (const item of arr) {
      map.set(item.name, item)
    }
    return Array.from(map.values())
  }

  /**
   * Sets the initial state of the parser runner.
   *
   * @param userOp - The user operation to be parsed.
   * @param erc7562Call - The ERC7562 call to be parsed.
   * @param validationResult - The validation result of the user operation.
   * @returns The initial state of the parser runner.
   */
  function init(
    userOp: UserOperation,
    erc7562Call: ERC7562Call,
    validationResult: ValidationResult,
  ): Erc7562ParserRunnerState {
    return {
      keccak: erc7562Call.keccak ?? [],
      ruleViolations: [],
      currentEntity: AccountAbstractionEntity.none,
      currentEntityAddress: '',
      contractAddresses: [],
      storageMap: {},
      delegatecallStorageAddress: erc7562Call.to,
      recursionDepth: 0,
      validationResult,
      userOp,
      erc7562Call,
    }
  }

  /**
   * Handles the violation detected during the parsing process.
   *
   * @param violation - The violation to be converted.
   * @returns An error representing the violation.
   */
  function violationDetected(
    violation: ERC7562Violation,
  ): Either<RpcError, Erc7562ParserRunnerState> {
    Logger.error({ violation }, 'ERC7562Parser(violationDetected)')
    return Either.Left(new RpcError(violation.description, violation.errorCode))
  }

  /**
   * Checks if the traceCall result contains calls from the entrypoint.
   *
   * @param runnerState  - The current state of the parser runner.
   * @returns Either an error or the updated state.
   */
  function isERC7562Calls(
    runnerState: Erc7562ParserRunnerState,
  ): Either<RpcError, Erc7562ParserRunnerState> {
    const { erc7562Call } = runnerState
    if (erc7562Call.calls == null || erc7562Call.calls.length < 1) {
      return Either.Left(
        new RpcError(
          'Unexpected traceCall result: no calls from entrypoint.',
          ValidationErrors.InternalError,
        ),
      )
    }
    return Either.Right(runnerState)
  }

  /**
   * Detects changes in the entity based on the current state of the parser runner.
   *
   * @param runnerState - The current state of the parser runner.
   * @returns Either an error or the updated state.
   */
  function detectEntityChange(
    runnerState: Erc7562ParserRunnerState,
  ): Either<RpcError, Erc7562ParserRunnerState> {
    const { erc7562Call, userOp } = runnerState
    if (
      erc7562Call.from.toLowerCase() !== ethers.ZeroAddress &&
      erc7562Call.from.toLowerCase() !== entryPointAddress &&
      erc7562Call.from.toLowerCase() !== senderCreatorAddress
    ) {
      return Either.Right(runnerState)
    }
    if (userOp.sender.toLowerCase() === erc7562Call.to.toLowerCase()) {
      runnerState.currentEntity = AccountAbstractionEntity.account
      runnerState.currentEntityAddress = userOp.sender
    } else if (
      erc7562Call.from.toLowerCase() === senderCreatorAddress &&
      userOp.factory?.toLowerCase() === erc7562Call.to.toLowerCase()
    ) {
      runnerState.currentEntity = AccountAbstractionEntity.factory
      runnerState.currentEntityAddress = userOp.factory
    } else if (
      userOp.paymaster?.toLowerCase() === erc7562Call.to.toLowerCase()
    ) {
      runnerState.currentEntity = AccountAbstractionEntity.paymaster
      runnerState.currentEntityAddress = userOp.paymaster
    } else if (entryPointAddress === erc7562Call.to.toLowerCase()) {
      runnerState.currentEntity = AccountAbstractionEntity.entryPoint
      runnerState.currentEntityAddress = entryPointAddress
    } else if (senderCreatorAddress === erc7562Call.to.toLowerCase()) {
      runnerState.currentEntity = AccountAbstractionEntity.senderCreator
      runnerState.currentEntityAddress = senderCreatorAddress
    } else {
      return Either.Left(
        new RpcError(
          `could not find entity name for address ${erc7562Call.to}. This should not happen. This is a bug.`,
          0,
        ),
      )
    }

    return Either.Right(runnerState)
  }

  /**
   * Checks if the current entity is staked.
   *
   * @param currentEntity - The current entity being processed.
   * @param validationResult - The validation result containing stake information.
   * @param entity - Optional specific entity to check against.
   * @returns True if the entity is staked, false otherwise.
   */
  function isEntityStaked(
    currentEntity: AccountAbstractionEntity,
    validationResult: ValidationResult,
    entity?: AccountAbstractionEntity,
  ): boolean {
    let entStake: StakeInfo | undefined
    switch (entity ?? currentEntity) {
      case AccountAbstractionEntity.account:
        entStake = validationResult.senderInfo
        break
      case AccountAbstractionEntity.factory:
        entStake = validationResult.factoryInfo
        break
      case AccountAbstractionEntity.paymaster:
        entStake = validationResult.paymasterInfo
        break
      default:
        break
    }
    return (
      entStake != null &&
      BigInt(1) <= BigInt(entStake.stake) &&
      BigInt(1) <= BigInt(entStake.unstakeDelaySec)
    )
  }

  /**
   * Checks if the address is a precompiled contract.
   *
   * @param address - The address to check.
   * @returns True if the address is a precompiled contract, false otherwise.
   */
  function isPrecompiled(address: string): boolean {
    const intAddress = parseInt(address, 16)
    if (intAddress < 1000 && intAddress >= 1) {
      return true
    }
    return false
  }

  /**
   * Checks if the address is a forbidden precompiled contract.
   * Precompiled contracts with addresses greater than 9 are forbidden.
   *
   * @param address - The address to check.
   * @returns True if the address is a forbidden precompiled contract, false otherwise.
   */
  function isForbiddenPrecompiled(address: string): boolean {
    const intAddress = parseInt(address, 16)
    return isPrecompiled(address) && intAddress > 9
  }

  /**
   * Checks if the call is to the entry point address.
   *
   * @param erc7562Call - The ERC7562 call to check.
   * @returns True if the call is to the entry point, false otherwise.
   */
  function isCallToEntryPoint(erc7562Call: ERC7562Call): boolean {
    return (
      erc7562Call.to?.toLowerCase() === entryPointAddress.toLowerCase() &&
      erc7562Call.from?.toLowerCase() !== entryPointAddress.toLowerCase() &&
      // skipping the top-level call from address(0) to 'simulateValidations()'
      erc7562Call.from?.toLowerCase() !== ethers.ZeroAddress.toLowerCase()
    )
  }

  /**
   * Attempts to detect a known method from the ERC7562 call input.
   *
   * @param erc7562Call - The ERC7562 call to check.
   * @returns The name of the method if found, otherwise the method signature.
   */
  function tryDetectKnownMethod(erc7562Call: ERC7562Call): string {
    let input = erc7562Call.input
    if (input == null) {
      return '<no-input>'
    }
    if (!input.startsWith('0x')) {
      // base64 encoded input
      input = '0x' + Buffer.from(input, 'base64').toString('hex')
    }
    const methodSig = get4bytes(erc7562Call.input)
    const AbiInterfaces = new Interface(
      uniqueNames([
        ...SENDER_CREATOR_ABI,
        ...IENTRY_POINT_ABI,
        ...IPAYMASTER_ABI,
        ...IACCOUNT_ABI,
      ]),
    )
    try {
      const abiFunction: FunctionFragment = AbiInterfaces.getFunction(methodSig)
      return abiFunction.name
    } catch (_) {
      //
    }
    return methodSig
  }

  /**
   * Checks if the given slot is associated with the given address.
   *
   * @param slot - The storage slot to check.
   * @param addr - The address to check against.
   * @param entitySlots - A map of addresses to their associated storage slots.
   * @returns True if the slot is associated with the address, false otherwise.
   */
  function associatedWith(
    slot: string,
    addr: string,
    entitySlots: { [addr: string]: Set<string> },
  ): boolean {
    const addrPadded = ethers.zeroPadValue(addr, 32).toLowerCase()
    if (slot === addrPadded) {
      return true
    }
    const k = entitySlots[addr]
    if (k == null) {
      return false
    }
    const slotN = BigInt(slot)
    // scan all slot entries to check of the given slot is within a structure, starting at that offset.
    // assume a maximum size on a (static) structure size.
    for (const k1 of k.keys()) {
      const kn = BigInt(k1)
      if (slotN >= kn && slotN < kn + BigInt(128)) {
        return true
      }
    }
    return false
  }

  /**
   * Attempts to get the name of the address based on the user operation.
   *
   * @param userOp - The user operation to check against.
   * @param address - The address to check.
   * @returns The name of the address if found, otherwise the address itself.
   */
  function tryGetAddressName(
    userOp: UserOperation,
    address: string,
  ): AccountAbstractionEntity | string {
    const lowerAddress = address.toLowerCase()
    if (lowerAddress === userOp.sender.toLowerCase()) {
      return AccountAbstractionEntity.account
    } else if (userOp.factory?.toLowerCase() === lowerAddress) {
      return AccountAbstractionEntity.factory
    } else if (userOp.paymaster?.toLowerCase() === lowerAddress) {
      return AccountAbstractionEntity.paymaster
    } else if (entryPointAddress === lowerAddress) {
      return AccountAbstractionEntity.entryPoint
    } else if (senderCreatorAddress === lowerAddress) {
      return AccountAbstractionEntity.senderCreator
    }
    return address
  }

  /**
   * Calculate storage slots associated with each entity.
   * keccak( A || ...) is associated with "A"
   *
   * @param userOp - The user operation to parse.
   * @param keccak - The keccak inputs to check against.
   * @returns A map of entity addresses to their associated storage slots.
   */
  function parseEntitySlots(
    userOp: UserOperation,
    keccak: string[],
  ): {
    [addr: string]: Set<string>
  } {
    // for each entity (sender, factory, paymaster), hold the valid slot addresses
    const entityAddresses = [
      userOp.sender.toLowerCase(),
      userOp.paymaster?.toLowerCase(),
      userOp.factory?.toLowerCase(),
    ]
    const entitySlots: { [addr: string]: Set<string> } = {}

    for (const keccakInput of keccak) {
      for (const entityAddress of entityAddresses) {
        if (entityAddress == null) {
          continue
        }
        const addrPadded = toBytes32(entityAddress)
        // valid slot: the slot was generated by keccak(entityAddr || ...)
        if (keccakInput.startsWith(addrPadded)) {
          if (entitySlots[entityAddress] == null) {
            entitySlots[entityAddress] = new Set<string>()
          }
          entitySlots[entityAddress].add(keccak256(keccakInput))
        }
      }
    }
    return entitySlots
  }

  /**
   * Enforce rules for banned opcodes.
   * OP-011: Blocked opcodes
   * OP-080: `BALANCE` (0x31) and `SELFBALANCE` (0x47) are allowed only from a staked entity, else they are blocked
   *
   * @param runnerState - The current state of the parser runner.
   * @returns Either an error or the updated state.
   */
  function checkOp011(
    runnerState: Erc7562ParserRunnerState,
  ): Either<RpcError, Erc7562ParserRunnerState> {
    Logger.debug('Checking for banned opcodes')
    if (runnerState.erc7562Call.to.toLowerCase() === entryPointAddress) {
      // Currently inside the EntryPoint deposit code, no access control applies here
      Logger.debug('Skipping banned opcode check for EntryPoint call')
      return Either.Right(runnerState)
    }
    const opcodes = runnerState.erc7562Call.usedOpcodes
    const bannedOpCodeUsed = Object.keys(opcodes)
      .map((opcode: string) => {
        return getOpcodeName(parseInt(opcode)) ?? ''
      })
      .filter((opcode: string) => {
        return bannedOpCodes.has(opcode)
      })

    for (const opcode of bannedOpCodeUsed) {
      const violation: ERC7562Violation = {
        rule: ERC7562Rule.op011,
        depth: runnerState.recursionDepth,
        entity: runnerState.currentEntity,
        address: runnerState.erc7562Call.to,
        delegatecallStorageAddress: runnerState.delegatecallStorageAddress,
        callFrameType: runnerState.erc7562Call.type,
        opcode,
        value: '0',
        errorCode: ValidationErrors.OpcodeValidation,
        description: `${runnerState.currentEntity.toString()} uses banned opcode: ${opcode.toString()}`,
      }
      runnerState.ruleViolations.push(violation)

      // break the loop if we find a opcode violation
      return violationDetected(violation)
    }

    return Either.Right(runnerState)
  }

  /**
   * Enforce rules for out-of-gas revert.
   * OP-020: Revert on "out of gas" is forbidden as it can "leak" the gas limit or the current call stack depth.
   *
   * @param runnerState - The current state of the parser runner.
   * @returns Either an error or the updated state.
   */
  function checkOp020(
    runnerState: Erc7562ParserRunnerState,
  ): Either<RpcError, Erc7562ParserRunnerState> {
    Logger.debug('Checking for out-of-gas revert')
    if (runnerState.erc7562Call.outOfGas) {
      return violationDetected({
        rule: ERC7562Rule.op020,
        depth: runnerState.recursionDepth,
        entity: runnerState.currentEntity,
        address: runnerState.erc7562Call.from,
        delegatecallStorageAddress: runnerState.delegatecallStorageAddress,
        opcode: runnerState.erc7562Call.type,
        callFrameType: runnerState.erc7562Call.type,
        value: '0',
        errorCode: ValidationErrors.OpcodeValidation,
        description: `${runnerState.currentEntity.toString()} internally reverts on oog`,
      })
    }
    return Either.Right(runnerState)
  }

  /**
   * Enforce rules for contract creation.
   * OP-031: CREATE2 is allowed exactly once in the deployment phase and must deploy code for the "sender" address.
   *
   * @param runnerState - The current state of the parser runner.
   * @returns Either an error or the updated state.
   */
  function checkOp031(
    runnerState: Erc7562ParserRunnerState,
  ): Either<RpcError, Erc7562ParserRunnerState> {
    Logger.debug('Checking for CREATE2 opcode')
    if (
      runnerState.erc7562Call.type !== 'CREATE' &&
      runnerState.erc7562Call.type !== 'CREATE2'
    ) {
      Logger.debug('Skipping CREATE2 check, not a CREATE or CREATE2 call')
      return Either.Right(runnerState)
    }
    const isFactoryStaked = isEntityStaked(
      runnerState.currentEntity,
      runnerState.validationResult,
      AccountAbstractionEntity.factory,
    )
    const isAllowedCreateByOP032 =
      runnerState.userOp.factory != null &&
      runnerState.erc7562Call.type === 'CREATE' &&
      (runnerState.currentEntity === AccountAbstractionEntity.account ||
        runnerState.currentEntity === AccountAbstractionEntity.factory) &&
      runnerState.erc7562Call.from.toLowerCase() ===
        runnerState.userOp.sender.toLowerCase()
    const isAllowedCreateByEREP060 =
      (runnerState.erc7562Call.from.toLowerCase() ===
        runnerState.userOp.sender?.toLowerCase() ||
        runnerState.erc7562Call.from.toLowerCase() ===
          runnerState.userOp.factory?.toLowerCase()) &&
      isFactoryStaked
    const isAllowedCreateSenderByFactory =
      runnerState.currentEntity === AccountAbstractionEntity.factory &&
      runnerState.erc7562Call.to.toLowerCase() ===
        runnerState.userOp.sender.toLowerCase()
    if (
      !(
        isAllowedCreateByOP032 ||
        isAllowedCreateByEREP060 ||
        isAllowedCreateSenderByFactory
      )
    ) {
      return violationDetected({
        rule: ERC7562Rule.op011,
        depth: runnerState.recursionDepth,
        entity: runnerState.currentEntity,
        address: runnerState.erc7562Call.from ?? 'n/a',
        delegatecallStorageAddress: runnerState.delegatecallStorageAddress,
        callFrameType: runnerState.erc7562Call.type,
        opcode: 'CREATE2',
        value: '0',
        errorCode: ValidationErrors.OpcodeValidation,
        description: `${runnerState.currentEntity.toString()} uses banned opcode: CREATE2`,
      })
    }
    return Either.Right(runnerState)
  }

  /**
   * Enforce rules for illegal address access. The only contract we allow to access
   * before its deployment is the "sender" itself, which gets created.
   * OP-041: Access to an address without a deployed code is forbidden for EXTCODE* and *CALL opcodes
   * OP-042
   *
   * @param runnerState - The current state of the parser runner.
   * @returns Either an error or the updated state.
   */
  function checkOp041(
    runnerState: Erc7562ParserRunnerState,
  ): Either<RpcError, Erc7562ParserRunnerState> {
    Logger.debug('Checking for un-deployed contract access')
    // the only contract we allow to access before its deployment is the "sender" itself, which gets created.
    let illegalZeroCodeAccess: any
    for (const address of Object.keys(runnerState.erc7562Call.contractSize)) {
      // skip precompiles
      if (isPrecompiled(address)) {
        continue
      }
      // [OP-042]
      if (
        address.toLowerCase() !== runnerState.userOp.sender.toLowerCase() &&
        address.toLowerCase() !== entryPointAddress &&
        runnerState.erc7562Call.contractSize[address].contractSize <= 2
      ) {
        illegalZeroCodeAccess = runnerState.erc7562Call.contractSize[address]
        illegalZeroCodeAccess.address = address
        return violationDetected({
          address,
          delegatecallStorageAddress: runnerState.delegatecallStorageAddress,
          depth: runnerState.recursionDepth,
          entity: runnerState.currentEntity,
          callFrameType: runnerState.erc7562Call.type,
          rule: ERC7562Rule.op041,
          errorCode: ValidationErrors.OpcodeValidation,
          description: `${runnerState.currentEntity.toString()} accesses un-deployed contract address ${illegalZeroCodeAccess?.address as string} with opcode ${illegalZeroCodeAccess?.opcode as string}`,
        })
      }
    }
    return Either.Right(runnerState)
  }

  /**
   * Enforce rules for illegal entry point access.
   * OP-052: May call `depositTo(sender)` with any value from either the `sender` or `factory`.
   * OP-053: May call the fallback function from the `sender` with any value.
   * OP-054: Any other access to the EntryPoint is forbidden.
   *
   * @param runnerState - The current state of the parser runner.
   * @returns Either an error or the updated state.
   */
  function checkOp054(
    runnerState: Erc7562ParserRunnerState,
  ): Either<RpcError, Erc7562ParserRunnerState> {
    const knownMethod = tryDetectKnownMethod(runnerState.erc7562Call)
    const isEntryPointCallAllowedRIP7560 =
      knownMethod === 'acceptAccount' ||
      knownMethod === 'acceptPaymaster' ||
      knownMethod === 'sigFailAccount' ||
      knownMethod === 'sigFailPaymaster'
    const isEntryPointCallAllowedOP052 = knownMethod === 'depositTo'
    const isEntryPointCallAllowedOP053 = knownMethod === '0x'
    const isEntryPointCallAllowed =
      isEntryPointCallAllowedOP052 ||
      isEntryPointCallAllowedOP053 ||
      isEntryPointCallAllowedRIP7560
    const isRuleViolated =
      isCallToEntryPoint(runnerState.erc7562Call) && !isEntryPointCallAllowed
    if (isRuleViolated) {
      return violationDetected({
        rule: ERC7562Rule.op054,
        depth: runnerState.recursionDepth,
        entity: runnerState.currentEntity,
        address: runnerState.erc7562Call.from,
        delegatecallStorageAddress: runnerState.delegatecallStorageAddress,
        opcode: runnerState.erc7562Call.type,
        value: runnerState.erc7562Call.value,
        callFrameType: runnerState.erc7562Call.type,
        errorCode: ValidationErrors.OpcodeValidation,
        description: `illegal call into EntryPoint during validation ${knownMethod}`,
      })
    }
    return Either.Right(runnerState)
  }

  /**
   * Enforce rules for illegal entry point access with EXTCODE* opcodes.
   * OP-054: Any access to the EntryPoint contract address with EXTCODE* opcodes is forbidden.
   *
   * @param runnerState - The current state of the parser runner.
   * @returns Either an error or the updated state.
   */
  function checkOp054ExtCode(
    runnerState: Erc7562ParserRunnerState,
  ): Either<RpcError, Erc7562ParserRunnerState> {
    for (const addr of runnerState.erc7562Call.extCodeAccessInfo) {
      if (addr.toLowerCase() === entryPointAddress) {
        return violationDetected({
          address: runnerState.erc7562Call.to,
          delegatecallStorageAddress: runnerState.delegatecallStorageAddress,
          depth: runnerState.recursionDepth,
          entity: runnerState.currentEntity,
          errorCode: ValidationErrors.OpcodeValidation,
          callFrameType: runnerState.erc7562Call.type,
          rule: ERC7562Rule.op054,
          description: `${runnerState.currentEntity} accesses EntryPoint contract address ${entryPointAddress} with EXTCODE* opcode`,
        })
      }
    }
    return Either.Right(runnerState)
  }

  /**
   * Enforce rules for illegal value calls.
   * OP-061:  CALL with value is forbidden. The only exception is a call to the EntryPoint described above.
   *
   * @param runnerState - The current state of the parser runner.
   * @returns Either an error or the updated state.
   */
  function checkOp061(
    runnerState: Erc7562ParserRunnerState,
  ): Either<RpcError, Erc7562ParserRunnerState> {
    const { erc7562Call, recursionDepth } = runnerState
    const isIllegalNonZeroValueCall =
      !isCallToEntryPoint(erc7562Call) &&
      !(BigInt(erc7562Call.value ?? 0) === BigInt(0))
    if (isIllegalNonZeroValueCall) {
      return violationDetected({
        rule: ERC7562Rule.op061,
        depth: recursionDepth,
        entity: runnerState.currentEntity,
        address: erc7562Call.from,
        delegatecallStorageAddress: runnerState.delegatecallStorageAddress,
        opcode: erc7562Call.type,
        value: erc7562Call.value,
        callFrameType: erc7562Call.type,
        errorCode: ValidationErrors.OpcodeValidation,
        description: 'May not make a CALL with value',
      })
    }
    return Either.Right(runnerState)
  }

  /**
   * OP-062: Precompiles:
   * - Only allow known accepted precompiles on the network, that do not access anything in the blockchain state or environment.
   * - The core precompiles 0x1 .. 0x9
   * - The RIP-7212 sec256r1 precompile, on networks that accepted it.
   *
   * @param runnerState - The current state of the parser runner.
   * @returns Either an error or the updated state.
   */
  function checkOp062AllowedPrecompiles(
    runnerState: Erc7562ParserRunnerState,
  ): Either<RpcError, Erc7562ParserRunnerState> {
    const { erc7562Call, recursionDepth } = runnerState
    for (const address of Object.keys(erc7562Call.contractSize)) {
      if (isForbiddenPrecompiled(address)) {
        return violationDetected({
          rule: ERC7562Rule.op062,
          depth: recursionDepth,
          entity: runnerState.currentEntity,
          address: erc7562Call.from,
          opcode: erc7562Call.type,
          value: erc7562Call.value,
          errorCode: ValidationErrors.OpcodeValidation,
          description: 'Illegal call to forbidden precompile ' + address,
          callFrameType: erc7562Call.type,
          delegatecallStorageAddress: runnerState.delegatecallStorageAddress,
        })
      }
    }
    return Either.Right(runnerState)
  }

  /**
   * OP-080: BALANCE (0x31) and SELFBALANCE (0x47) are allowed only from a staked entity, else they are blocked
   *
   * @param runnerState - The current state of the parser runner.
   * @returns Either an error or the updated state.
   */
  function checkOp080(
    runnerState: Erc7562ParserRunnerState,
  ): Either<RpcError, Erc7562ParserRunnerState> {
    const opcodes = runnerState.erc7562Call.usedOpcodes
    const onlyStakedOpCodeUsed = Object.keys(opcodes)
      .map((opcode: string) => {
        return getOpcodeName(parseInt(opcode)) ?? ''
      })
      .filter((opcode: string) => {
        return (
          opcodesOnlyInStakedEntities.has(opcode) &&
          !isEntityStaked(
            runnerState.currentEntity,
            runnerState.validationResult,
          )
        )
      })
    for (const opcode of onlyStakedOpCodeUsed) {
      return violationDetected({
        rule: ERC7562Rule.op011,
        depth: runnerState.recursionDepth,
        entity: runnerState.currentEntity,
        address: runnerState.erc7562Call.from ?? 'n/a',
        delegatecallStorageAddress: runnerState.delegatecallStorageAddress,
        opcode,
        callFrameType: runnerState.erc7562Call.type,
        value: '0',
        errorCode: ValidationErrors.OpcodeValidation,
        description: `unstaked ${runnerState.currentEntity.toString()} uses banned opcode: ${opcode}`,
      })
    }
    return Either.Right(runnerState)
  }

  /**
   * EREP-050: An unstaked `paymaster` may not return a `context`.
   *
   * @param runnerState - The current state of the parser runner.
   * @returns Either an error or the updated state.
   */
  function checkErep050(
    runnerState: Erc7562ParserRunnerState,
  ): Either<RpcError, Erc7562ParserRunnerState> {
    const isUnstakedPaymaster =
      runnerState.currentEntity === AccountAbstractionEntity.paymaster &&
      !isEntityStaked(runnerState.currentEntity, runnerState.validationResult)
    if (
      isUnstakedPaymaster &&
      runnerState.validationResult.paymasterInfo?.context != null &&
      runnerState.validationResult.paymasterInfo?.context !== '0x'
    ) {
      return violationDetected({
        rule: ERC7562Rule.erep050,
        depth: runnerState.recursionDepth,
        entity: runnerState.currentEntity,
        address: runnerState.erc7562Call.from ?? 'n/a',
        delegatecallStorageAddress: runnerState.delegatecallStorageAddress,
        callFrameType: runnerState.erc7562Call.type,
        value: '0',
        errorCode: ValidationErrors.OpcodeValidation,
        description: 'unstaked paymaster returned a context',
      })
    }
    return Either.Right(runnerState)
  }

  /**
   * Enforce rules for storage access.
   *  - [STO-010]
   *  - [STO-021]
   *  - [STO-022]
   *  - [STO-031]
   *  - [STO-032]
   *  - [STO-033]
   *
   * @param runnerState - The current state of the parser runner.
   * @returns Either an error or the updated state.
   */
  function checkStorage(
    runnerState: Erc7562ParserRunnerState,
  ): Either<RpcError, Erc7562ParserRunnerState> {
    const { erc7562Call, userOp } = runnerState
    if (erc7562Call.to.toLowerCase() === entryPointAddress) {
      // Currently inside system code, no access control applies here
      return Either.Right(runnerState)
    }
    const allSlots: string[] = [
      ...Object.keys(erc7562Call.accessedSlots.writes ?? {}),
      ...Object.keys(erc7562Call.accessedSlots.reads ?? {}),
      ...Object.keys(erc7562Call.accessedSlots.transientWrites ?? {}),
      ...Object.keys(erc7562Call.accessedSlots.transientReads ?? {}),
    ]
    const address: string = erc7562Call.to
    const entitySlots = parseEntitySlots(userOp, runnerState.keccak)
    const addressName = tryGetAddressName(userOp, address)
    const isEntityStakedRes = isEntityStaked(
      runnerState.currentEntity,
      runnerState.validationResult,
    )
    const isFactoryStaked = isEntityStaked(
      runnerState.currentEntity,
      runnerState.validationResult,
      AccountAbstractionEntity.factory,
    )
    const isSenderCreation = userOp.factory != null
    for (const slot of allSlots) {
      if (runnerState.storageMap[address] == null) {
        runnerState.storageMap[address] = {}
      }
      ;(runnerState.storageMap[address] as SlotMap)[slot] = ''
      const isSenderInternalSTO010: boolean =
        address.toLowerCase() === userOp.sender.toLowerCase()
      const isSenderAssociated: boolean = associatedWith(
        slot,
        userOp.sender.toLowerCase(),
        entitySlots,
      )
      const isEntityInternalSTO031: boolean =
        address.toLowerCase() === runnerState.currentEntityAddress.toLowerCase()
      const isEntityAssociatedSTO032: boolean = associatedWith(
        slot,
        runnerState.currentEntityAddress.toLowerCase(),
        entitySlots,
      )
      const isReadOnlyAccessSTO033: boolean =
        erc7562Call.accessedSlots.writes?.[slot] == null &&
        erc7562Call.accessedSlots.transientWrites?.[slot] == null

      const isAllowedIfEntityStaked =
        isEntityInternalSTO031 ||
        isEntityAssociatedSTO032 ||
        isReadOnlyAccessSTO033
      const isAllowedST031ST032ST033: boolean =
        isAllowedIfEntityStaked && isEntityStakedRes

      const isAllowedSTO021: boolean = isSenderAssociated && !isSenderCreation
      const isAllowedIfFactoryStaked = isSenderAssociated && isSenderCreation
      const isAllowedSTO022: boolean =
        isAllowedIfFactoryStaked && isFactoryStaked
      const allowed =
        isSenderInternalSTO010 ||
        isAllowedSTO021 ||
        isAllowedSTO022 ||
        isAllowedST031ST032ST033
      if (!allowed) {
        let description: string
        if (
          (isAllowedIfEntityStaked && !isEntityStakedRes) ||
          (isAllowedIfFactoryStaked && !isFactoryStaked)
        ) {
          description = `unstaked ${runnerState.currentEntity.toString()} accessed ${addressName} slot ${slot}`
        } else {
          const isWrite =
            Object.keys(erc7562Call.accessedSlots.writes ?? {}).includes(
              slot,
            ) ||
            Object.keys(
              erc7562Call.accessedSlots.transientWrites ?? {},
            ).includes(slot)
          const isTransient =
            Object.keys(
              erc7562Call.accessedSlots.transientReads ?? {},
            ).includes(slot) ||
            Object.keys(
              erc7562Call.accessedSlots.transientWrites ?? {},
            ).includes(slot)
          const readWrite = isWrite ? 'write to' : 'read from'
          const transientStr = isTransient ? 'transient ' : ''
          description = `${runnerState.currentEntity.toString()} has forbidden ${readWrite} ${transientStr}${addressName} slot ${slot}`
        }
        return violationDetected({
          address,
          delegatecallStorageAddress: runnerState.delegatecallStorageAddress,
          depth: runnerState.recursionDepth,
          entity: runnerState.currentEntity,
          errorCode: ValidationErrors.OpcodeValidation,
          rule: ERC7562Rule.sto010,
          callFrameType: erc7562Call.type,
          description,
        })
      }
    }
    return Either.Right(runnerState)
  }

  /**
   * Steps through the traceCall result and checks for violations.
   *
   * @param runnerState - The current state of the parser runner.
   * @returns Either an error or the updated state.
   */
  function runner(
    runnerState: Erc7562ParserRunnerState,
  ): Either<RpcError, Erc7562ParserRunnerState> {
    // Use a stack to process the calls iteratively, adding top-level call first
    const stack: Erc7562ParserRunnerState[] = [runnerState]
    let result: Either<RpcError, Erc7562ParserRunnerState> =
      Either.Right(runnerState)

    while (stack.length > 0) {
      Logger.debug(
        `Processing ${stack.length === 1 ? 'call' : 'next subcall'} from stack at recursionDepth ${stack[stack.length - 1].recursionDepth}`,
      )
      const currentState = stack.pop()
      if (!currentState) continue

      const address: string = currentState.erc7562Call.to.toLowerCase()
      if (
        address === entryPointAddress &&
        currentState.erc7562Call.from === entryPointAddress
      ) {
        // don't enforce rules self-call (it's an "innerHandleOp" that slipped into the trace)
        Logger.debug(
          'Skipping self-call to EntryPoint, no rules to enforce here',
        )
        continue
      }

      // TODO: This need to be a accumulation of all addresses across all calls/subcalls
      currentState.contractAddresses.push(address)

      result = detectEntityChange(currentState)
        .flatMap(checkOp011)
        .flatMap(checkOp020)
        .flatMap(checkOp031)
        .flatMap(checkOp041)
        .flatMap(checkOp054)
        .flatMap(checkOp054ExtCode)
        .flatMap(checkOp061)
        .flatMap(checkOp062AllowedPrecompiles)
        .flatMap(checkOp080)
        .flatMap(checkErep050)
        .flatMap(checkStorage)

      // If any rule violation was detected, return the error immediately
      if (result.isLeft()) {
        return result
      }

      //Push the subcall onto the stack with an incremented recursion depth for the current call
      if (result.isRight()) {
        const updatedState = result.getOrElse(undefined)
        if (!updatedState) {
          return Either.Left(
            new RpcError(
              'Unexpected error: updated state is undefined.',
              ValidationErrors.InternalError,
            ),
          )
        }

        for (const call of updatedState.erc7562Call.calls ?? []) {
          const newContext: string =
            call.type === 'DELEGATECALL'
              ? updatedState.delegatecallStorageAddress
              : call.to

          Logger.debug(
            `Pushing subcall onto stack at recursion depth ${updatedState.recursionDepth + 1}...`,
          )
          stack.push({
            ...updatedState,
            erc7562Call: call,
            delegatecallStorageAddress: newContext,
            recursionDepth: updatedState.recursionDepth + 1,
          })
        }
      }
    }

    return result
  }

  return {
    parseTracerResult: (
      userOp: UserOperation,
      erc7562Call: ERC7562Call,
      validationResult: ValidationResult,
    ): Either<RpcError, ERC7562ValidationResults> => {
      Logger.debug(
        'Running erc7562TracerResultParser on full validation results',
      )

      return Either.Right<RpcError, Erc7562ParserRunnerState>(
        init(userOp, erc7562Call, validationResult),
      )
        .flatMap(isERC7562Calls)
        .flatMap(runner)
        .flatMap(({ contractAddresses, ruleViolations, storageMap }) =>
          Either.Right({
            contractAddresses,
            ruleViolations,
            storageMap,
          }),
        )
    },
  }
}
