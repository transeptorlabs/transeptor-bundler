// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.15;

import "@account-abstraction/interfaces/IEntryPoint.sol";

contract GetUserOpHashes {
    error UserOpHashesResult(bytes32[] userOpHashes);

    constructor(IEntryPoint entryPoint, PackedUserOperation[] memory packedUserOps) {
        revert UserOpHashesResult(
            getUserOpHashes(entryPoint, packedUserOps));
    }

    function getUserOpHashes(IEntryPoint entryPoint, PackedUserOperation[] memory packedUserOps) public view returns (bytes32[] memory ret) {
        ret = new bytes32[](packedUserOps.length);
        for (uint i = 0; i < packedUserOps.length; i++) {
            ret[i] = entryPoint.getUserOpHash(packedUserOps[i]);
        }
    }
}