import { BundleManager, JsonrpcHttpServer, Config, MempoolManager } from './modules'

async function runBundler() {
    // init globals
    Config
    MempoolManager
    BundleManager

    // start the bundler server
    const bundlerServer = new JsonrpcHttpServer()
    await bundlerServer.start()
}

runBundler().catch(async (error) => {
    console.error('Aborted', error)
    process.exit(1)
})