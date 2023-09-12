#!/bin/bash

# This script is used to run the compliance bunlder spec test. Private keys are default hardhat accounts.
export MNEMONIC='test test test test test test test test test test test junk'
export BENEFICIARY='0xd21934eD8eAf27a67f0A70042Af50A1D6d195E81'

npm run start:prod
