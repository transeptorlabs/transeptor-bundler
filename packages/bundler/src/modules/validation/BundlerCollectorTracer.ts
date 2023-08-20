// This is the same BundlerCollectorTracer from github.com/eth-infinitism/bundler
import { LogCallFrame, LogContext, LogDb, LogFrameResult, LogStep, LogTracer } from './GethTracer'

// functions available in a context of geth tracer
declare function toHex (a: any): string

declare function toWord (a: any): string

declare function toAddress (a: any): string

declare function isPrecompiled (addr: any): boolean

/**
 * return type of our BundlerCollectorTracer.
 * collect access and opcodes, split into "levels" based on NUMBER opcode
 * keccak, calls and logs are collected globally, since the levels are unimportant for them.
 */
export interface BundlerCollectorReturn {
  /**
 * storage and opcode info, collected on top-level calls from EntryPoint
 */
  callsFromEntryPoint: TopLevelCallInfo[]

  /**
   * values passed into KECCAK opcode
   */
  keccak: string[]
  calls: Array<ExitInfo | MethodInfo>
  logs: LogInfo[]
  debug: any[]
}

export interface MethodInfo {
  type: string
  from: string
  to: string
  method: string
  value: any
  gas: number
}

export interface ExitInfo {
  type: 'REVERT' | 'RETURN'
  gasUsed: number
  data: string
}

export interface TopLevelCallInfo {
  topLevelMethodSig: string
  topLevelTargetAddress: string
  opcodes: { [opcode: string]: number }
  access: { [address: string]: AccessInfo }
  contractSize: { [addr: string]: ContractSizeInfo }
  oog?: boolean
}

/**
 * It is illegal to access contracts with no code in validation even if it gets deployed later.
 * This means we need to store the {@link contractSize} of accessed addresses at the time of access.
 */
export interface ContractSizeInfo {
  opcode: string
  contractSize: number
}

export interface NumberLevelInfo {
  opcodes: { [opcode: string]: number }
  access: { [address: string]: AccessInfo }
  contractSize: { [addr: string]: number }
  oog?: boolean
}

export interface AccessInfo {
  // slot value, just prior this operation
  reads: { [slot: string]: string }
  // count of writes.
  writes: { [slot: string]: number }
}

export interface LogInfo {
  topics: string[]
  data: string
}

/**
 * type-safe local storage of our collector. contains all return-value properties.
 * (also defines all "trace-local" variables and functions)
 */
interface BundlerCollectorTracer extends LogTracer, BundlerCollectorReturn {
  lastOp: string
  stopCollectingTopic: string
  stopCollecting: boolean
  currentLevel: TopLevelCallInfo
  topLevelCallCounter: number
  countSlot: (list: { [key: string]: number | undefined }, key: any) => void
}

/**  javascript code of tracer function
 * tracer to collect data for opcode banning.
 * this method is passed as the "tracer" for eth_traceCall (note, the function itself)
 */
export function bundlerCollectorTracer (): BundlerCollectorTracer {
  return {
    callsFromEntryPoint: [],
    currentLevel: null as any,
    keccak: [],
    calls: [],
    logs: [],
    debug: [],
    lastOp: '',
    stopCollectingTopic: 'bb47ee3e183a558b1a2ff0874b079f3fc5478b7454eacf2bfc5af2ff5878f972',
    stopCollecting: false,
    topLevelCallCounter: 0,

    fault (log: LogStep, db: LogDb): void {
      this.debug.push('fault depth=', log.getDepth(), ' gas=', log.getGas(), ' cost=', log.getCost(), ' err=', log.getError())
    },

    result (ctx: LogContext, db: LogDb): BundlerCollectorReturn {
      return {
        callsFromEntryPoint: this.callsFromEntryPoint,
        keccak: this.keccak,
        logs: this.logs,
        calls: this.calls,
        debug: this.debug
      }
    },

    enter (frame: LogCallFrame): void {
      if (this.stopCollecting) {
        return
      }
      this.calls.push({
        type: frame.getType(),
        from: toHex(frame.getFrom()),
        to: toHex(frame.getTo()),
        method: toHex(frame.getInput()).slice(0, 10),
        gas: frame.getGas(),
        value: frame.getValue()
      })
    },
    exit (frame: LogFrameResult): void {
      if (this.stopCollecting) {
        return
      }
      this.calls.push({
        type: frame.getError() != null ? 'REVERT' : 'RETURN',
        gasUsed: frame.getGasUsed(),
        data: toHex(frame.getOutput()).slice(0, 4000)
      })
    },

    countSlot (list: { [key: string]: number | undefined }, key: any) {
      list[key] = (list[key] ?? 0) + 1
    },
    step (log: LogStep, db: LogDb): any {
      if (this.stopCollecting) {
        return
      }
      const opcode = log.op.toString()
      if (log.getGas() < log.getCost()) {
        this.currentLevel.oog = true
      }

      if (opcode === 'REVERT' || opcode === 'RETURN') {
        if (log.getDepth() === 1) {
          const ofs = parseInt(log.stack.peek(0).toString())
          const len = parseInt(log.stack.peek(1).toString())
          const data = toHex(log.memory.slice(ofs, ofs + len)).slice(0, 4000)
          this.calls.push({
            type: opcode,
            gasUsed: 0,
            data
          })
        }
      }

      if (log.getDepth() === 1) {
        if (opcode === 'CALL' || opcode === 'STATICCALL') {
          const addr = toAddress(log.stack.peek(1).toString(16))
          const topLevelTargetAddress = toHex(addr)
          // stack.peek(2) - value
          const ofs = parseInt(log.stack.peek(3).toString())
          // stack.peek(4) - len
          const topLevelMethodSig = toHex(log.memory.slice(ofs, ofs + 4))

          this.currentLevel = this.callsFromEntryPoint[this.topLevelCallCounter] = {
            topLevelMethodSig,
            topLevelTargetAddress,
            access: {},
            opcodes: {},
            contractSize: {}
          }
          this.topLevelCallCounter++
        } else if (opcode === 'LOG1') {
          const topic = log.stack.peek(2).toString(16)
          if (topic === this.stopCollectingTopic) {
            this.stopCollecting = true
          }
        }
        this.lastOp = ''
        return
      }

      if (opcode.match(/^(EXT.*|CALL|CALLCODE|DELEGATECALL|STATICCALL)$/) != null) {
        const idx = opcode.startsWith('EXT') ? 0 : 1
        const addr = toAddress(log.stack.peek(idx).toString(16))
        const addrHex = toHex(addr)
        if (this.currentLevel.contractSize[addrHex] == null && !isPrecompiled(addr)) {
          this.currentLevel.contractSize[addrHex] = {
            contractSize: db.getCode(addr).length,
            opcode
          }
        }
      }

      if (this.lastOp === 'GAS' && !opcode.includes('CALL')) {
        this.countSlot(this.currentLevel.opcodes, 'GAS')
      }
      if (opcode !== 'GAS') {
        if (opcode.match(/^(DUP\d+|PUSH\d+|SWAP\d+|POP|ADD|SUB|MUL|DIV|EQ|LTE?|S?GTE?|SLT|SH[LR]|AND|OR|NOT|ISZERO)$/) == null) {
          this.countSlot(this.currentLevel.opcodes, opcode)
        }
      }
      this.lastOp = opcode

      if (opcode === 'SLOAD' || opcode === 'SSTORE') {
        const slot = toWord(log.stack.peek(0).toString(16))
        const slotHex = toHex(slot)
        const addr = log.contract.getAddress()
        const addrHex = toHex(addr)
        let access = this.currentLevel.access[addrHex]
        if (access == null) {
          access = {
            reads: {},
            writes: {}
          }
          this.currentLevel.access[addrHex] = access
        }
        if (opcode === 'SLOAD') {
          if (access.reads[slotHex] == null && access.writes[slotHex] == null) {
            access.reads[slotHex] = toHex(db.getState(addr, slot))
          }
        } else {
          this.countSlot(access.writes, slotHex)
        }
      }

      if (opcode === 'KECCAK256') {
        const ofs = parseInt(log.stack.peek(0).toString())
        const len = parseInt(log.stack.peek(1).toString())
        if (len > 20 && len < 512) {
          this.keccak.push(toHex(log.memory.slice(ofs, ofs + len)))
        }
      } else if (opcode.startsWith('LOG')) {
        const count = parseInt(opcode.substring(3))
        const ofs = parseInt(log.stack.peek(0).toString())
        const len = parseInt(log.stack.peek(1).toString())
        const topics = []
        for (let i = 0; i < count; i++) {
          topics.push('0x' + log.stack.peek(2 + i).toString(16))
        }
        const data = toHex(log.memory.slice(ofs, ofs + len))
        this.logs.push({
          topics,
          data
        })
      }
    }
  }
}
