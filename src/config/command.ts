import { Command, OptionValues } from 'commander'

type CommandOptions = {
  args: readonly string[]
  nodeVersion: string
  defaultNetwork: string
}

export const getCmdOptionValues = (ops: CommandOptions): OptionValues => {
  const { args, nodeVersion, defaultNetwork } = ops
  const program = new Command()

  program
    .version(`${nodeVersion}`)
    .option(
      '--unsafe',
      'UNSAFE mode: Enable no storage or opcode checks during userOp simulation. SAFE mode(default).',
    )
    .option(
      '--network <string>',
      'Ethereum network provider.',
      `${defaultNetwork}`,
    )
    .option(
      '--httpApi <string>',
      'ERC4337 rpc method namespaces to enable.',
      'web3,eth',
    )
    .option('--port <number>', 'Bundler node listening port.', '4337')
    .option(
      '--minBalance <string>',
      'Minimum ETH balance needed for signer address.',
      '1',
    )
    .option(
      '--minStake <string>',
      'Minimum stake an entity has to have to pass the reputation system.',
      '1',
    ) // The stake value is not enforced on-chain, but specifically by each node while simulating a transaction
    .option(
      '--minUnstakeDelay <number>',
      'Time paymaster has to wait to unlock the stake(seconds).',
      '0',
    ) // One day - 84600
    .option(
      '--bundleSize <number>',
      'Maximum number of pending mempool entities to start auto bundler.',
      '10',
    )
    .option(
      '--maxBundleGas <number>',
      'Max gas the bundler will use in transactions.',
      '5000000',
    )
    .option('--auto', 'Automatic bundling.', false)
    .option(
      '--autoBundleInterval <number>',
      'Auto bundler interval in (ms).',
      '12000',
    )
    .option(
      '--txMode <string>',
      `Bundler transaction mode (base, searcher).
        (base mode): Sends bundles using eth_sendRawTransaction RPC(does not protect against front running).
        (searcher mode): Sends bundles  using Flashbots Auction to protect the transaction against front running (only available on Mainnet)`,
      'base',
    )
    .option('--metrics', 'Bundler node metrics tracking enabled.', false)
    .option(
      '--influxdbUrl <string>',
      'Url influxdb is running on (requires --metrics to be enabled).',
      'http://localhost:8086',
    )
    .option(
      '--influxdbOrg <string>',
      'Influxdb org (requires --metrics to be enabled).',
      'transeptor-labs',
    )
    .option(
      '--influxdbBucket <string>',
      'Influxdb bucket (requires --metrics to be enabled).',
      'transeptor_metrics',
    )
    .option('--p2p', 'p2p mode enabled', false)
    .option('--findPeers', 'Search for peers when p2p is enabled.', false)
    .option(
      '--eip7702Support',
      'On networks with EIP-7702 enabled, the eth_sendUserOperation method accepts an extra eip7702Auth parameter.',
      true,
    )
    .option('--auditTrail <boolean>', 'Enable audit trail.', false)

  const programOpts: OptionValues = program.parse(args).opts()
  return programOpts
}
