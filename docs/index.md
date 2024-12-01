---
sidebar_position: 1
description: Introduction to Transeptor

title: Introduction
---

## Why is Transeptor Needed? 

More applications are being built on the Ethereum ecosystem, expanding its reach. But, this growth has made it more complex for users to manage their EOA (Externally Owned Accounts). A new proposal called ERC-4337 aims to simplify this process by allowing users to use smart contract wallets instead of EOAs.

One crucial component of the ERC-4337 is Bundlers, which are the infrastructure of Account Abstraction. The ERC-4337 Bundler ecosystem needs bundler diversity and the ability to allow any actor to participate in the bundling process. We are supporting the development of an ERC-4337 bundler to increase bundler diversity in the ERC-4337 ecosystem.

## Why client diversity is important

Bundler nodes that participate in the bundling of UserOperation need access to a diverse set of Bundler implementations. Having multiple Bundler options helps to increase the security, stability, and overall health of the account abstraction layer by reducing the risk of a single point of failure. If too many participants use the same Bundler implementation, it could lead to a centralization of the network, creating an attack vector for malicious actors. In a scenario where a single bundler implementation is processing the majority of the network's userOps, malicious actors could target known vulnerabilities in that implementation to disrupt the network, or a critical bug could lead to a network halt.


## What is ERC-4337

ERC-4337 is a higher-layer infrastructure for Ethereum to allow account abstraction. This will enable users to use a smart contract account as the primary account to handle all network interactions. ERC-4337 introduces a new transaction called a UserOperation. Users will send signed UserOperations to a network of nodes called bundlers. Bundlers act as proxy bundling multiple userOps single transactions sending to Entrypoint smart contract to execute users' actions. ERC-4337 also introduces paymaster smart contracts to allow transaction sponsorship. With Paymaster, users have gasless transactions or pay gas fees with ERC-20 tokens.