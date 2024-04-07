// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

contract GlobalCounter {
    uint256 public currentCount;

    constructor() {
        currentCount = 0;
    }

    function increment() external {
        currentCount += 1;
    }
}