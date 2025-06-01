---
sidebar_position: 2
id: debug-namespace
description: Describe all Eth namespace RPC methods supported by Transeptor.

title: debug Namespace
---

*All `debug` namespace RPC methods listed here require our Bundler to be 100% compliant as an [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337) Bundler.*

<hr></hr>

## debug_bundler_clearState
Clears the bundler mempool and reputation data of paymasters/accounts/factories/aggregators.

Example Request:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "debug_bundler_clearState",
  "params": []
}
```

Example Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": "ok"
}
```

## debug_bundler_dumpMempool
Clears the bundler mempool and reputation data of paymasters/accounts/factories/aggregators.

Example Request:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "debug_bundler_dumpMempool",
  "params": ["0x1306b01bC3e4AD202612D3843387e94737673F53"]
}
```

Example Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    {
      "sender": "0x1234...5678",
      "nonce": "0x01", 
      "initCode": "0x1234...5678",
      "callData": "0x1234...5678",
      "callGasLimit": "0x05",
      "verificationGasLimit": "0x05",
      "preVerificationGas": "0x05",
      "maxFeePerGas": "0x05",
      "maxPriorityFeePerGas": "0x05",
      "signature": "0x1234...5678"
    }
  ]
}
```

## debug_bundler_sendBundleNow
Forces the bundler to execute the entire current mempool.

Example Request:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "debug_bundler_sendBundleNow",
  "params": []
}
```

Example Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": "0xdead9e43632ac70c46b4003434058b18db0ad809617bd29f3448d46ca9085576"
}
```

## debug_bundler_setBundlingMode
Toggles bundling mode between 'auto' and 'manual'.

Example Request:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "debug_bundler_setBundlingMode",
  "params": ["manual"]
}
```

Example Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": "ok"
}
```

## debug_bundler_setReputation
Sets reputation of given addresses.

Example Request:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "debug_bundler_setReputation",
  "params": [
    [
      {
        "address": "0x7A0A0d159218E6a2f407B99173A2b12A6DDfC2a6",
        "opsSeen": "0x14",
        "opsIncluded": "0x0D"
      }
    ],
    "0x1306b01bC3e4AD202612D3843387e94737673F53"
  ]
}
```

Example Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": "ok"
}
```

## debug_bundler_dumpReputation
Returns the reputation data of all observed addresses.

Example Request:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "debug_bundler_dumpReputation",
  "params": ["0x1306b01bC3e4AD202612D3843387e94737673F53"]
}
```

Example Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    { "address": "0x7A0A0d159218E6a2f407B99173A2b12A6DDfC2a6",
      "opsSeen": "0x14",
      "opsIncluded": "0x13",
      "status": "ok"
    }
  ]
}
```