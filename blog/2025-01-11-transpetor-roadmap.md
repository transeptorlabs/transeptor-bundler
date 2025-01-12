---
title: Transeptor 2025 Roadmap
description: This is the high-level road map for Transeptor.
slug: transeptor-2025-roadmap
authors:
  name: Idris Bowman
  title: Transeptor maintainer
  url: https://github.com/V00D00-child
  image_url: https://github.com/V00D00-child.png
  email: bowmanidris95@gmail.com
tags: [roadmap, MEV, CCIP, userOp mempool]
image: https://i.imgur.com/mErPwqL.png
---

We are excited to announce our development plans for 2025.

<!-- truncate -->

## Overview

At Transeptor Lab, we are dedicated to building open software for the community. Last year, Transeptor underwent extensive maintenance to ensure our bundler was stable. This year, we plan to push the boundaries of Transeptor, exploring areas such as p2p and Cross-chain interoperability.

## Features & Priorities

> We encourage community members to suggest new features that are not listed by joining the roadmap discussion [Transeptor issue board.](https://github.com/transeptorlabs/transeptor-bundler/discussions/111)

### Research/Cross-chain interoperability
Using [Chainlink CCIP](https://chain.link/cross-chain), we will explore offering custom RPC methods that allow dapps to invoke cross-chain tx from 4337 compatible smart accounts.

Transeptor will develop:
- A `CCIP Sender contract` that will send CCIP messages from Layer 1 to a `CCIP Router` with the message's payload containing encoded calldata for the `handleOps()` function.
- A `CCIP Recevier contract` on a set of supported networks. Incoming CCIP messages will trigger a callback function that will call the `handleOps()`, passing the encoded calldata to the `EntryPoint` contract to execute the user's intent.

Developer building 4337 compatible dapps will no longer need to maintain multiple bundler URLs to support various networks and will send all userOps to a single bundler url via these custom Cross-chain interoperability rpc methods. This also enables the ability to take advantage of Layer 2's low-fee execution environment while abstracting the chain complexity from users.

### Feature/p2p mempool
Transeptor bundler has been in active development for just over a year, and the software is stable enough to start the development effort to join the p2p bundler mempool. Solo bundler operators running Transeptor can participate in the public mempool to encourage censorship resistance and promote decentralization.

### Research/UserOp mempool MEV
The userOp mempol is public, and bundlers submit transactions similar to block builders. Given this circumstance, a searcher could run a bundler and extract MEV from other bundlers who decided to participate in the public mempool. This creates a situation where sophisticated searchers can "front-run" other bundlers, potentially stealing revenue by submitting a valid UserOp first. The original bundler that validated the userOp bears the cost of reverted handleOps transactions.

Submitting userOps to the public mempool benefits users by protecting them against censorship; however, it also exposes users to MEV.

If the userOp MEV problem is not addressed, it could lead to Bundler node operators partnering with dapps or wallet providers to submit userOp via private order flow. This scenario creates an end game that ultimately contradicts decentralization and can jeopardize the success of the public mempool as users are forced into closed systems to avoid MEV. 

We may not be able to mitigate MEV entirely on the public mempool. Still, we will explore solutions that utilize Trusted Execution Environments (TEEs) to minimize malicious MEV while maintaining user privacy.

### Enhancement/Maintain 100% compatibility
We will actively work to ensure 100% compatibility with the bundler spec by promptly releasing fixes for any failing bundler spec test. Maintaining 100% compatibility is essential to prevent fragmentation when participating in the public p2p mempool.

## Community Involvement
If you would like to contribute, check out [our contribution guide](https://github.com/transeptorlabs/transeptor-bundler/blob/main/CONTRIBUTING.md) and join the [2025 roadmap discussion](https://github.com/transeptorlabs/transeptor-bundler/discussions/111) to share thoughts on the project's direction.

To keep up with the status of feature releases, use [X](https://x.com/transeptorlabs); we will actively post updates on our progress.

## References
- Flashbots Research, [State of Wallets 2024](https://writings.flashbots.net/state-of-wallets-2024)
- Yoav Weiss, [Unified ERC-4337 mempool](https://notes.ethereum.org/@yoav/unified-erc-4337-mempool)