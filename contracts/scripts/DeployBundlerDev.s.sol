// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { console2 } from "forge-std/console2.sol";
import { Script } from "forge-std/Script.sol";
import { EntryPoint } from "@account-abstraction/core/EntryPoint.sol";
import { SimpleAccountFactory } from "@account-abstraction/samples/SimpleAccountFactory.sol";
import { GlobalCounter } from "../src/GlobalCounter.sol"; 

contract DeployBundlerDev is Script{
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey_ = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey_);

        address deployedEpAddress;
        address simpleFactroyAddress;
        address globalCounterAddress;
        if (block.chainid != 1337 && block.chainid != 31337) {
            console2.log("Using pre-deployed entrypoint");
            deployedEpAddress = address(0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789);
        } else {
            EntryPoint entryPoint = new EntryPoint();
            SimpleAccountFactory simpleFactroy = new SimpleAccountFactory(entryPoint);
            GlobalCounter globalCounter = new GlobalCounter();

            deployedEpAddress = address(entryPoint);
            simpleFactroyAddress = address(simpleFactroy);
            globalCounterAddress = address(globalCounter);
        }   

        vm.stopBroadcast();

        console2.log("__DEPLOYED_CONTRACT_ADDRESSES__");
        console2.log("Successfully deployed EntryPoint v0. and SimpleAccountFactory");
        console2.log("EntryPoint: %s", address(deployedEpAddress));
        console2.log("SimpleAccountFactory: %s", address(simpleFactroyAddress));
        console2.log("GlobalCounter: %s", address(globalCounterAddress));
        console2.log("_________________________________");
    }
}