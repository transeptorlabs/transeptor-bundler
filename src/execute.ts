import { BundleManager, JsonrpcHttpServer, Config, MempoolManager, ReputationManager } from './modules'

async function runBundler() {
    // init singleton globals
    Config
    MempoolManager
    BundleManager
    ReputationManager

    const bundlerServer = new JsonrpcHttpServer()
    await bundlerServer.start()
}

runBundler().catch(async (error) => {
    console.error('Aborted', error)
    process.exit(1)
})