---
sidebar_position: 3
id: error-codes
description: Describe all error codes returned by Transeptor when a request fails.

title: Error Codes
---

Below are error codes returned by transeptor when a request fails.

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
