// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.15;

contract KingOfTheHill {
    address public currentKing;
    uint256 public currentBid;
    string public kingMessage;

    event NewKing(address indexed king, uint bid, string message);

    constructor() {
        currentKing = msg.sender;
        currentBid = 0;
    }

    function becomeKing(string memory message) external payable {
        require(msg.value > currentBid, "Your bid is not higher than the current bid");

        currentBid = msg.value;
        currentKing = msg.sender;
        kingMessage = message;

        emit NewKing(currentKing, currentBid, kingMessage);
    }

    function withdraw() external {
        require(msg.sender != currentKing, "Only the current king can't withdraw");

        uint amount = address(this).balance;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
    }
}
