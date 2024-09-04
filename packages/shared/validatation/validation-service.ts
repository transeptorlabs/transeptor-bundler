import { 
  BigNumber, 
  ContractFactory,
  ethers, 
  providers 
} from "ethers";

import { GET_CODE_HASH_ABI, GET_CODE_HASH_BYTECODE } from "../abis/index.js";
import {
  fullSimulateValidation,
  partialSimulateValidation,
} from "./sim.js";
import { Logger } from "../logger/index.js";
import {
  ReferencedCodeHashes,
  StorageMap,
  UserOperation,
  ValidateUserOpResult,
  ValidationErrors,
  ValidationResult,
  BundlerCollectorReturn,
} from "../types/index.js";
import {
  requireCond,
  requireAddressAndFields,
  calcPreVerificationGas,
} from "../utils/index.js";

import { tracerResultParser } from "./parseScannerResult.js";
import { createProviderService } from "../provider/provider-service.js";

export type ValidationService = {
  /**
   * validate UserOperation.
   * should also handle unmodified memory (e.g. by referencing cached storage in the mempool
   * one item to check that was un-modified is the aggregator.
   * @param userOp
   * @param previousCodeHashes
   * @param checkStakes
   */
  validateUserOp(
    userOp: UserOperation,
    isUnsafeMode: boolean,
    checkStakes: boolean,
    previousCodeHashes?: ReferencedCodeHashes
  ): Promise<ValidateUserOpResult>;

  /**
   * perform static checking on input parameters.
   * 
   * @param userOp
   * @param entryPointInput
   * @param requireSignature
   * @param requireGasParams
   */
  validateInputParameters(
    userOp: UserOperation,
    entryPointInput: string,
    requireSignaturn: boolean,
    requireGasParams: boolean
  ): void;
};

const getCodeHashes = async (
  addresses: string[],
  provider: providers.JsonRpcProvider
): Promise<ReferencedCodeHashes> => {
  const getCodeHashesFactory = new ethers.ContractFactory(
    GET_CODE_HASH_ABI,
    GET_CODE_HASH_BYTECODE
  ) as ContractFactory;

  const ps = createProviderService(provider)

  const { hash } = await ps.runContractScript(
    getCodeHashesFactory,
    [addresses]
  );

  return {
    hash,
    addresses,
  };
}

export const createValidationService = (_provider: providers.JsonRpcProvider, _entryPointContract: ethers.Contract) => {
  const provider = _provider
  const entryPointContract = _entryPointContract
  const HEX_REGEX = /^0x[a-fA-F\d]*$/i
  const VALID_UNTIL_FUTURE_SECONDS = 30 // how much time into the future a UserOperation must be valid in order to be accepted

  return {
    validateUserOp: async (
      userOp: UserOperation,
      isUnsafeMode: boolean,
      previousCodeHashes?: ReferencedCodeHashes,
      checkStakes = true
    ): Promise<ValidateUserOpResult> => {
      if (
        previousCodeHashes != null &&
        previousCodeHashes.addresses.length > 0
      ) {
        const { hash: codeHashes } = await getCodeHashes(
          previousCodeHashes.addresses,
          provider
        );

        // [COD-010]
        requireCond(
          codeHashes === previousCodeHashes.hash,
          "modified code after first validation",
          ValidationErrors.OpcodeValidation
        );
      }

      let res: ValidationResult;
      let codeHashes: ReferencedCodeHashes = {
        addresses: [],
        hash: "",
      };
      let storageMap: StorageMap = {};

      // if we are in unsafe mode, we skip the full validation with custom tracer and only run the partial validation with no stake or opcode checks
      if (!isUnsafeMode) {
        let tracerResult: BundlerCollectorReturn;
        [res, tracerResult] = await fullSimulateValidation(
          entryPointContract.address,
          provider,
          userOp
        ).catch((e) => {
          throw e;
        });

        let contractAddresses: string[];
        [contractAddresses, storageMap] = tracerResultParser(
          userOp,
          tracerResult,
          res,
          entryPointContract
        );

        // if no previous contract hashes, then calculate hashes of contracts
        if (previousCodeHashes == null) {
          codeHashes = await getCodeHashes(contractAddresses, provider);
        }

        if ((res as any) === "0x") {
          throw new Error("simulateValidation reverted with no revert string!");
        }
      } else {
        res = await partialSimulateValidation(
          entryPointContract.address,
          provider,
          userOp
        );
      }

      requireCond(
        !res.returnInfo.sigFailed,
        "Invalid UserOp signature or paymaster signature",
        ValidationErrors.InvalidSignature
      );

      const now = Math.floor(Date.now() / 1000);
      requireCond(
        res.returnInfo.validAfter <= now,
        `time-range in the future time ${res.returnInfo.validAfter}, now=${now}`,
        ValidationErrors.NotInTimeRange
      );

      requireCond(
        res.returnInfo.validUntil == null || res.returnInfo.validUntil >= now,
        "already expired",
        ValidationErrors.NotInTimeRange
      );

      requireCond(
        res.returnInfo.validUntil == null ||
          res.returnInfo.validUntil > now + VALID_UNTIL_FUTURE_SECONDS,
        "expires too soon",
        ValidationErrors.NotInTimeRange
      );

      requireCond(
        res.aggregatorInfo == null,
        "Currently not supporting aggregator",
        ValidationErrors.UnsupportedSignatureAggregator
      );

      const verificationCost = BigNumber.from(res.returnInfo.preOpGas).sub(
        userOp.preVerificationGas
      );
      const extraGas = BigNumber.from(userOp.verificationGasLimit)
        .sub(verificationCost)
        .toNumber();
      requireCond(
        extraGas >= 2000,
        `verificationGas should have extra 2000 gas. has only ${extraGas}`,
        ValidationErrors.SimulateValidation
      );

      Logger.debug("UserOp passed validation");
      return {
        ...res,
        referencedContracts: codeHashes,
        storageMap,
      };
    },

    validateInputParameters: (
      userOp: UserOperation,
      entryPointInput: string,
      requireSignature = true,
      requireGasParams = true
    ): void => {
      requireCond(
        entryPointInput != null,
        "No entryPoint param",
        ValidationErrors.InvalidFields
      );
      requireCond(
        entryPointInput.toLowerCase() ===
          entryPointContract.address.toLowerCase(),
        `The EntryPoint at "${entryPointInput}" is not supported. This bundler uses ${entryPointContract.address}`,
        ValidationErrors.InvalidFields
      );

      // minimal sanity check: userOp exists, and all members are hex
      requireCond(
        userOp != null,
        "No UserOperation param",
        ValidationErrors.InvalidFields
      );

      const fields = ["sender", "nonce", "callData"];
      if (requireSignature) {
        fields.push("signature");
      }
      if (requireGasParams) {
        fields.push(
          "preVerificationGas",
          "verificationGasLimit",
          "callGasLimit",
          "maxFeePerGas",
          "maxPriorityFeePerGas"
        );
      }
      fields.forEach((key) => {
        const value: string = (userOp as any)[key]?.toString();
        requireCond(
          value != null,
          "Missing userOp field: " + key + " " + JSON.stringify(userOp),
          ValidationErrors.InvalidFields
        );
        requireCond(
          value.match(HEX_REGEX) != null,
          `Invalid hex value for property ${key}:${value} in UserOp`,
          ValidationErrors.InvalidFields
        );
      });

      requireAddressAndFields(
        userOp,
        "paymaster",
        ["paymasterPostOpGasLimit", "paymasterVerificationGasLimit"],
        ["paymasterData"]
      );
      requireAddressAndFields(userOp, "factory", ["factoryData"]);

      const calcPreVerificationGas1 = calcPreVerificationGas(userOp);
      requireCond(
        BigNumber.from(userOp.preVerificationGas).gte(
          BigNumber.from(calcPreVerificationGas1)
        ),
        `preVerificationGas ${BigNumber.from(
          userOp.preVerificationGas
        )} too low: expected at least ${calcPreVerificationGas1}`,
        ValidationErrors.InvalidFields
      );
    },
  };
};
