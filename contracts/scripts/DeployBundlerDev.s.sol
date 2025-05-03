// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { console2 } from "forge-std/console2.sol";
import { Script } from "forge-std/Script.sol";
import { EntryPoint } from "@account-abstraction/core/EntryPoint.sol";
import { SimpleAccountFactory } from "@account-abstraction/accounts/SimpleAccountFactory.sol";
import { GlobalCounter } from "../src/GlobalCounter.sol"; 

contract DeployBundlerDev is Script{
    function setUp() public {}

    function run() public {
        vm.startBroadcast();
        address deployedEpAddress;
        address simpleFactoryAddress;
        address globalCounterAddress;
        if (block.chainid != 1337 && block.chainid != 31337) {
            console2.log("Using pre-deployed entrypoint");
            deployedEpAddress = address(0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789);
        } else {
            EntryPoint entryPoint = new EntryPoint();
            SimpleAccountFactory simpleFactory = new SimpleAccountFactory(entryPoint);
            GlobalCounter globalCounter = new GlobalCounter();

            deployedEpAddress = address(entryPoint);
            simpleFactoryAddress = address(simpleFactory);
            globalCounterAddress = address(globalCounter);
        }   

        vm.stopBroadcast();

        console2.log("__DEPLOYED_CONTRACT_ADDRESSES__");
        console2.log("EntryPoint: %s", address(deployedEpAddress));
        console2.log("SimpleAccountFactory: %s", address(simpleFactoryAddress));
        console2.log("GlobalCounter: %s", address(globalCounterAddress));
        console2.log("_________________________________");
    }
}