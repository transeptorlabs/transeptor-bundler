---
sidebar_position: 2
id: debug-namespace
description: Describe all Eth namespace RPC methods supported by Transeptor.

title: debug Namespace
---

*All `debug` namespace RPC methods listed here require our Bundler to be 100% compliant as an [EIP-4337](https://eips.ethereum.org/EIPS/eip-4337) Bundler.*

<hr></hr>

### Error Response Codes
Below are error codes for `eth_sendUserOperation` , `eth_estimateUserOperationGas` operations.

| Code        | Message                                                                      | Data                              |
| ----------- | -----------                                                                  |  -----------                      |
| 32602       | Invalid UserOperation struct/fields                                          |  None                            |
| 32500       | Transaction rejected by entryPoint’s simulateValidation, during wallet creation or validation                                                                                   |  None                             |
| 32501       | Transaction rejected by paymaster’s validatePaymasterUserOp                  |  Contain a paymaster value        |
| 32502       | Transaction rejected because of opcode validation                            |  None                            |
| 32503       | UserOperation out of time-range: either wallet or paymaster returned a time-range, and it is already expired (or will expire soon)                                          |  Contain the `validUntil` and `validAfter` values or a paymaster value for errors triggered by the `paymaster` |
| 32504       | Transaction rejected because paymaster (or signature aggregator) is throttled/banned                                          |  Contain a paymaster or aggregator value, depending on the failed entity                            |
| 32505       | transaction rejected because paymaster (or signature aggregator) stake or unstake-delay is too low                                         |  contain a paymaster or aggregator value, depending on the failed entity or field SHOULD contain a `minimumStake` and `minimumUnstakeDelay`                           |
| 32506       | Transaction rejected because wallet specified unsupported signature aggregator                                          |  Contain an aggregator value                            |
| 32507       | Transaction rejected because of wallet signature check failed (or paymaster signature if the paymaster uses its data as signature)                                          |  None                            |


Example failure responses:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "message": "AA21 didn't pay prefund",
    "code": -32500
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "message": "paymaster stake too low",
    "data": {
      "paymaster": "0x123456789012345678901234567890123456790",
      "minimumStake": "0xde0b6b3a7640000",
      "minimumUnstakeDelay": "0x15180"
    },
    "code": -32504
  }
}
```
