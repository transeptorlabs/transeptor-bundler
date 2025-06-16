import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import { tcp } from '@libp2p/tcp'
import { Multiaddr, isMultiaddr, multiaddr } from '@multiformats/multiaddr'
import { createLibp2p, Libp2p } from 'libp2p'
import { PingService, pingService } from 'libp2p/ping'

import { TranseptorLogger } from '../types/index.js'
import { withReadonly } from '../utils/index.js'

export type Libp2pNodeManagerConfig = {
  peerMultiaddrs: string[]
  connectToPeers: boolean
  logger: TranseptorLogger
}

export type Libp2pNodeManager = {
  start: () => Promise<void>
  stop: () => Promise<void>
}

const GOSSIP_MAX_SIZE = 1048576 // (= 1048576, 1 MiB) The maximum allowed size of uncompressed gossip messages.
// const MAX_OPS_PER_REQUEST = 4096 // Maximum number of UserOps in a single request.
// const RESP_TIMEOUT = 10 // (seconds) The maximum time for complete response transfer.
// const TTFB_TIMEOUT = 5 // (seconds) The maximum time to wait for first byte of request response (time-to-first-byte).

/**
 * Creates a libp2p node manager.
 *
 * @param config - The configuration for the libp2p node manager.
 * @returns A libp2p node manager.
 */
function _createLibp2pNodeManager(
  config: Readonly<Libp2pNodeManagerConfig>,
): Libp2pNodeManager {
  let node:
    | Libp2p<{
        ping: PingService
      }>
    | undefined = undefined
  const { peerMultiaddrs, connectToPeers, logger } = config

  const validatePeerMultiAddress = (peerMultiaddrs: string[]) => {
    for (const peerMultiaddr of peerMultiaddrs) {
      if (!isMultiaddr(multiaddr(peerMultiaddr))) {
        throw new Error(`Invalid peerMultiaddr ${peerMultiaddr}`)
      }
    }
  }

  const createNewNode = async () => {
    const newNode = await createLibp2p({
      start: false,
      addresses: {
        // add a listen address (localhost) to accept TCP connections on a random port
        listen: ['/ip4/127.0.0.1/tcp/0'],
      },
      transports: [tcp()],
      connectionEncryption: [noise()],
      streamMuxers: [
        mplex({
          maxUnprocessedMessageQueueSize: GOSSIP_MAX_SIZE,
        }),
      ],
      services: {
        ping: pingService({
          protocolPrefix: 'ipfs', // default
        }),
      },
    })

    newNode.addEventListener('peer:discovery', (evt: any) => {
      logger.info(evt, 'Discovered peer')
    })

    newNode.addEventListener('peer:connect', (evt: any) => {
      logger.info(evt, 'Connected to peer')
    })

    return newNode
  }

  const doPing = async () => {
    logger.info('Starting pinging remote peer to check connectivity')
    const pingService = node.services.ping as PingService
    if (peerMultiaddrs.length > 0 && connectToPeers) {
      const ma: Multiaddr = multiaddr(peerMultiaddrs[0])
      const latency = await pingService.ping(ma)
      logger.info(`pinged remote peer at ${peerMultiaddrs[0]} in ${latency}ms`)
    } else {
      logger.info('No remote peer address given, skipping ping')
    }
  }

  validatePeerMultiAddress(peerMultiaddrs)

  return {
    start: async () => {
      if (node) {
        await node.start()
      } else {
        node = await createNewNode()
        await node.start()
      }

      logger.info('libp2p node listening on addresses:')
      node.getMultiaddrs().forEach((addr: Multiaddr) => {
        logger.info(`- ${addr.toString()}`)
      })

      await doPing()
    },

    stop: async () => {
      if (!node) {
        logger.info('Libp2p node is not created, skipping stop')
        return
      }
      await node.stop()
      logger.info('Stopping libp2p node')
    },
  }
}

export const createLibp2pNodeManager = withReadonly<
  Libp2pNodeManagerConfig,
  Libp2pNodeManager
>(_createLibp2pNodeManager)
