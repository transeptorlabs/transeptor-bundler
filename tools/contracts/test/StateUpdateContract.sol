// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.15;

contract StateUpdateContract {
    string public currentState;

    event StateUpdated(string newState);

    constructor(string memory initialState) {
        currentState = initialState;
    }

    function updateState(string memory newState) external {
        currentState = newState;

        emit StateUpdated(newState);
    }
}