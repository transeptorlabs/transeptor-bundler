import { Libp2p, createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'

const GOSSIP_MAX_SIZE = 1048576 // (= 1048576, 1 MiB) The maximum allowed size of uncompressed gossip messages.
const MAX_OPS_PER_REQUEST = 4096 // Maximum number of UserOps in a single request.
const RESP_TIMEOUT = 10 // (seconds) The maximum time for complete response transfer.
const TTFB_TIMEOUT = 5 // (seconds) The maximum time to wait for first byte of request response (time-to-first-byte).

export class Libp2pNode {

    private node: Libp2p<{
        x: Record<string, unknown>;
    }> | undefined;

    constructor() {
        // 
    }

    private async createNode() {
        this.node = await createLibp2p({
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
            )]
        })
    }

    public async start () {
        // start libp2p
        if (this.node) {
            await this.node.start()
            console.log('libp2p has started')
    
            // print out listening addresses
            console.log('listening on addresses:')
            this.node.getMultiaddrs().forEach((addr) => {
                console.log(addr.toString())
            })
        } else {
            await this.createNode()
            await this.start()
        }
    }
    
    public async stop () {
        // stop libp2p
        if (!this.node) {
            throw new Error('Libp2p node is not created')
        }
        await this.node.stop()
        console.log('libp2p has stopped')
    }
}

