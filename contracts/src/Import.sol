//SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// import contracts to get their type info for e2e test.
import { SimpleAccount } from  "@account-abstraction/samples/SimpleAccount.sol";
import { SimpleAccountFactory } from  "@account-abstraction/samples/SimpleAccountFactory.sol";
import { EntryPointSimulations } from "@account-abstraction/core/EntryPointSimulations.sol";
import { BaseAccount } from "@account-abstraction/core/BaseAccount.sol";
import { SenderCreator } from "@account-abstraction/core/SenderCreator.sol";