import { ethers } from 'ethers'
import { UserOperation } from '../../types'
import { Logger } from '../../logger'
import { getAddr, requireCond, tostr } from '../../utils'
import { ProviderService } from '../../provider'
import { resolveProperties } from 'ethers/lib/utils'
import { BundleManager } from '../../bundle'

export class EthAPI {
  private readonly entryPointContract: ethers.Contract
  private readonly providerService: ProviderService
  private readonly bundleManager: BundleManager
  private readonly HEX_REGEX = /^0x[a-fA-F\d]*$/i

  constructor(
    entryPointContract: ethers.Contract,
    providerService: ProviderService,
    bundleManager: BundleManager,
  ) {
    this.entryPointContract = entryPointContract
    this.providerService = providerService
    this.bundleManager = bundleManager
  }

  public async sendUserOperation(userOp: UserOperation, supportedEntryPoints: string) {
    await this.validateParameters(userOp, supportedEntryPoints)
    const userOpReady = await resolveProperties(userOp)

    Logger.debug(
      {
        sender: userOpReady.sender,
        nonce: tostr(userOpReady.nonce),
        entryPoint: supportedEntryPoints,
        paymaster: getAddr(userOpReady.paymasterAndData),
      },
      "send UserOperation"
    )

    const callData = this.entryPointContract.interface.encodeFunctionData(
      'getUserOpHash',
      [userOpReady]
    )
    const result = await this.providerService.call(
      this.entryPointContract.address,
      callData
    )
    const userOpHash = this.entryPointContract.interface.decodeFunctionResult(
      'getUserOpHash',
      result
    )[0] as string

    await this.bundleManager.sendUserOperation(userOpReady, userOpHash, userOpHash)

    return userOpHash
  }

  public getSupportedEntryPoints(): string[] {
    return [this.entryPointContract.address];
  }

  private async validateParameters(
    userOp1: UserOperation,
    entryPointInput: string
  ): Promise<void> {
    requireCond(entryPointInput != null, "No entryPoint param", -32602);

    if (
      entryPointInput?.toString().toLowerCase() !==
      this.entryPointContract.address.toLowerCase()
    ) {
      throw new Error(
        `The EntryPoint at "${entryPointInput}" is not supported. This bundler uses ${this.entryPointContract.address}`
      );
    }
    // minimal sanity check: userOp exists, and all members are hex
    requireCond(userOp1 != null, "No UserOperation param");
    const userOp = (await resolveProperties(userOp1)) as any;

    const fields = [
      "sender",
      "nonce",
      "initCode",
      "callData",
      "paymasterAndData",
      "signature",
      "preVerificationGas",
      "verificationGasLimit",
      "callGasLimit",
      "maxFeePerGas",
      "maxPriorityFeePerGas",
    ];

    fields.forEach((key) => {
      requireCond(
        userOp[key] != null,
        "Missing userOp field: " + key + JSON.stringify(userOp),
        -32602
      );
      const value: string = userOp[key].toString();
      requireCond(
        value.match(this.HEX_REGEX) != null,
        `Invalid hex value for property ${key}:${value} in UserOp`,
        -32602
      );
    });
  }
}

