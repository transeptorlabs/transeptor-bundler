// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { console2 } from "forge-std/console2.sol";
import { Script } from "forge-std/Script.sol";
import { GlobalCounter } from "../src/GlobalCounter.sol"; 
import { SimpleAccountFactory } from "@account-abstraction/accounts/SimpleAccountFactory.sol";
import { IEntryPoint } from "@account-abstraction/interfaces/IEntryPoint.sol";

contract DeployBundlerDev is Script{
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey_ = vm.envUint("PRIVATE_KEY_E2E");
        address entryPointAddress_ = vm.envAddress("ENTRYPOINT_ADDRESS_E2E");

        require(entryPointAddress_ != address(0), "Invalid ENTRY_POINT_ADDRESS");

        vm.startBroadcast(deployerPrivateKey_);

        address simpleFactoryAddress;
        address globalCounterAddress;

        IEntryPoint entryPoint = IEntryPoint(entryPointAddress_);
        SimpleAccountFactory simpleFactory = new SimpleAccountFactory(entryPoint);
        GlobalCounter globalCounter = new GlobalCounter();

        globalCounterAddress = address(globalCounter);
        simpleFactoryAddress = address(simpleFactory);

        vm.stopBroadcast();

        console2.log("__DEPLOYED_CONTRACT_ADDRESSES__");
        console2.log("Successfully deployed EntryPoint v0.8 and SimpleAccountFactory");
        console2.log("ChainId: %s", block.chainid);
        console2.log("EntryPoint Address: %s", entryPointAddress_);
        console2.log("GlobalCounter: %s", globalCounterAddress);
        console2.log("SimpleAccountFactory: %s", simpleFactoryAddress);
        console2.log("_________________________________");
    }
}