import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import { PingService, pingService } from 'libp2p/ping'
import { Multiaddr, isMultiaddr, multiaddr } from '@multiformats/multiaddr'

const GOSSIP_MAX_SIZE = 1048576 // (= 1048576, 1 MiB) The maximum allowed size of uncompressed gossip messages.
const MAX_OPS_PER_REQUEST = 4096 // Maximum number of UserOps in a single request.
const RESP_TIMEOUT = 10 // (seconds) The maximum time for complete response transfer.
const TTFB_TIMEOUT = 5 // (seconds) The maximum time to wait for first byte of request response (time-to-first-byte).

export class Libp2pNode {

    private node: any | undefined
    private peerMultiaddrs: string[]
    private connectToPeers: boolean

    constructor(peerMultiaddrs: string[], connectToPeers: boolean) {
        this.node === undefined

        // check that each peerMultiaddrs isMultiaddr
        for (const peerMultiaddr of peerMultiaddrs) {
            if (!isMultiaddr(multiaddr(peerMultiaddr))) {
                throw new Error(`Invalid peerMultiaddr ${peerMultiaddr}`)
            }
        }
        this.peerMultiaddrs = peerMultiaddrs
        this.connectToPeers = connectToPeers
    }

    private async createNode() {
        this.node = await createLibp2p({
            start: false,
            addresses: {
                // add a listen address (localhost) to accept TCP connections on a random port
                listen: ['/ip4/127.0.0.1/tcp/0']
            },
            transports: [tcp()],
            connectionEncryption: [noise()],
            streamMuxers: [mplex(
                {
                    maxUnprocessedMessageQueueSize: GOSSIP_MAX_SIZE,
                }
            )],
            services: {
                ping: pingService({
                    protocolPrefix: 'ipfs', // default
                }),
            },
        })

        this.node.addEventListener('peer:discovery', (evt: any) => {
            console.log(evt, 'Discovered peer')
          })
          
        this.node.addEventListener('peer:connect', (evt: any) => {
            console.log(evt, 'Connected to peer')
        })
    }

    public async start () {
        if (this.node) {
            await this.node.start()

            console.log('libp2p node listening on addresses:')
            this.node.getMultiaddrs().forEach((addr: Multiaddr) => {
                console.log(`- ${addr.toString()}`)
            })

            await this.doPing()
        } else {
            await this.createNode()
            await this.start()
        }
    }

    private async doPing() {
        console.log('Starting pinging remote peer to check connectivity')
        const pingService = this.node.services.ping as PingService
        if (this.peerMultiaddrs.length >= 0 && this.connectToPeers) {
            const ma: Multiaddr = multiaddr(this.peerMultiaddrs[0])
            const latency = await pingService.ping(ma)
            console.log(`pinged remote peer at ${this.peerMultiaddrs[0]} in ${latency}ms`)
        } else {
            console.log('No remote peer address given, skipping ping')
        }
    }
    
    public async stop () {
        if (!this.node) {
            throw new Error('Libp2p node is not created')
        }
        await this.node.stop()
        console.log('Stoping libp2p node')
    }
}

