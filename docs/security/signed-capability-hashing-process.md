# Signed Capability Hashing Process

This document outlines how Transeptor implements cryptographically verifiable **object capabilities (OCAPs)** with using EVM compatible encoding and hashing.

---

## Capability Hash Input Structure

Each capability request is hashed using EVM-compatible `keccak256` with ABI encoding. The fields included in the hash are:

- `moduleName: string` – The internal module requesting access (e.g., `reputation-manager`)
- `requestorAddress: address` – The Ethereum address used by the module to sign the request
- `nonce: string` – A unique nonce to prevent replay attacks
- `caps` – The capabilities being requested. The structure of the tuple is define by the resource type:
  - StateOperations: `tuple(string key, string[] operations)[]`

### StateOperations type

#### ABI Encoding Format

```ts
abi.encode(
  string moduleName,
  address requestorAddress,
  string nonce,
  tuple(string key, string[] operations)[]
)
```

#### Rule: operations[] Must Be Sorted Alphabetically

Since EVM hashing is order-sensitive, we enforce a rule that all `operations[]` arrays in the capability struct must be **sorted alphabetically** before hashing.

```ts

['read', 'write'] ✅ OK
['write', 'read'] ❌ Will generate a different hash
```

This guarantees deterministic behavior across implementations.

> Canonicalization Policy: Transeptor always sorts operations[] alphabetically before hashing or signing a capability.

### Capability Hashing

To enforce cryptographic integrity and ensure that capabilities can be verified both offchain (e.g JavaScript, Rust) and onchain (e.eg Solidity), each capability request is hashed using EVM `KECCAK256 ` cryptographic hashing standard.

**Hashing in JavaScript**

```ts
import { keccak256, AbiCoder } from 'ethers'

const sortedStateOperations = (
  operations: StateOperations[],
): StateOperations[] => [...operations].sort((a, b) => a.localeCompare(b))

const encoded = (capability: Capability<CapabilityTypes.State>) => {
  const abiCoder = AbiCoder.defaultAbiCoder()
  const { issuer, clientVersion, moduleName, salt, ocaps } = capability
  const operations = ocaps.map((cap) => ({
    type: cap.type,
    data: sortedStateOperations(cap.data.operations),
  }))

  return abiCoder.encode(
    [
      'address',
      'string',
      'string',
      'string',
      'tuple(string key, string[] operations)[]',
    ],
    [issuer, clientVersion, moduleName, salt, operations],
  )
}

const hash = keccak256(encoded(cap))
```

**Hashing in solidity**

````solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CapabilityEncoder {
  struct Operation {
    string key;
    string[] operations;
  }

  /**
    * Encodes a state capability into a bytes string
    *
    * @param issuer The address of the issuer
    * @param clientVersion The client version string
    * @param moduleName The module name
    * @param salt The salt string
    * @param ocaps An array of Operation structs
    * @return encoded The ABI-encoded capability
    */
  function encodeStateCapability(
    address issuer,
    string memory clientVersion,
    string memory moduleName,
    string memory salt,
    Operation[] memory ocaps# Signed Capability Hashing Process

This document outlines how Transeptor implements cryptographically verifiable **object capabilities (OCAPs)** with using EVM compatible encoding and hashing.

---

## Capability Hash Input Structure

Each capability request is hashed using EVM-compatible `keccak256` with ABI encoding. The fields included in the hash are:

- `moduleName: string` – The internal module requesting access (e.g., `reputation-manager`)
- `requestorAddress: address` – The Ethereum address used by the module to sign the request
- `nonce: string` – A unique nonce to prevent replay attacks
- `caps` – The capabilities being requested. The structure of the tuple is define by the resource type:
  - StateOperations: `tuple(string key, string[] operations)[]`

### StateOperations type

#### ABI Encoding Format

```ts
abi.encode(
  string moduleName,
  address requestorAddress,
  string nonce,
  tuple(string key, string[] operations)[]
)
````

#### Rule: operations[] Must Be Sorted Alphabetically

Since EVM hashing is order-sensitive, we enforce a rule that all `operations[]` arrays in the capability struct must be **sorted alphabetically** before hashing.

```ts

['read', 'write'] ✅ OK
['write', 'read'] ❌ Will generate a different hash
```

This guarantees deterministic behavior across implementations.

> Canonicalization Policy: Transeptor always sorts operations[] alphabetically before hashing or signing a capability.

### Capability Hashing

To enforce cryptographic integrity and ensure that capabilities can be verified both offchain (e.g JavaScript, Rust) and onchain (e.eg Solidity), each capability request is hashed using EVM `KECCAK256 ` cryptographic hashing standard.

**Hashing in JavaScript**

```js
import { keccak256, AbiCoder } from 'ethers'

const encoded = (capability) => {
  const abiCoder = AbiCoder.defaultAbiCoder()
  const { issuer, clientVersion, moduleName, salt, ocaps } = capability

  return abiCoder.encode(
    [
      'address',
      'string',
      'string',
      'string',
      'tuple(string key, string[] operations)[]',
    ],
    [issuer, clientVersion, moduleName, salt, ocaps],
  )
}

const hash = keccak256(encoded(cap))
```

**Hashing in solidity**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CapabilityEncoder {
    struct Operation {
      string key;
      string[] operations;
    }


    function encodeStateCapability(
      address issuer,
      string memory clientVersion,
      string memory moduleName,
      string memory salt,
        Operation[] memory ocaps
    ) public pure returns (bytes memory) {
      return abi.encode(issuer, clientVersion, moduleName, salt, ocaps);
    }


    function hashStateCapability(
      address issuer,
      string memory clientVersion,
      string memory moduleName,
      string memory salt,
      Operation[] memory ocaps
    ) public pure returns (bytes32) {
      return keccak256(
        encodeStateCapability(issuer, clientVersion, moduleName, salt, ocaps)
      );
    }
}
```

### Signing the Capability

Uses the standard EVM [(EIP-191)](https://eips.ethereum.org/EIPS/eip-191) compliant signature format.

**JavaScript**

```ts
import { Wallet } from 'ethers'

const wallet = new Wallet(privateKey)
const signature = await wallet.signMessage(hash)
```

### Verifying the Capability

This check ensures the capability was signed by the expected module’s Ethereum key.

**JavaScript**

```js
import { ethers } from 'ethers'

const recoveredAddress = ethers.verifyMessage(hash, signature)

if (recoveredAddress.toLowerCase() !== requestorAddress.toLowerCase()) {
  throw new Error('Invalid signature: address mismatch')
}
```

### Signing the Capability

Uses the standard EVM [(EIP-191)](https://eips.ethereum.org/EIPS/eip-191) compliant signature format.

**JavaScript**

```ts
import { Wallet } from 'ethers'

const wallet = new Wallet(privateKey)
const signature = await wallet.signMessage(hash)
```

### Verifying the Capability

This check ensures the capability was signed by the expected module’s Ethereum key.

**JavaScript**

```js
import { ethers } from 'ethers'

const recoveredAddress = await ethers.utils.verifyMessage(hash, signature)

if (recoveredAddress.toLowerCase() !== requestorAddress.toLowerCase()) {
  throw new Error('Invalid signature: address mismatch')
}
```
