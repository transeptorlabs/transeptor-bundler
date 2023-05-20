import { BundleManager, JsonrpcHttpServer, Config, MempoolManager, ReputationManager, EventsManager } from './modules'

async function runBundler() {
    // init singleton globals
    Config
    MempoolManager
    BundleManager
    EventsManager

    ReputationManager
    ReputationManager.addWhitelist(Config.whitelist)
    ReputationManager.addBlacklist(Config.blacklist)

    const bundlerServer = new JsonrpcHttpServer()
    await bundlerServer.start()
}

runBundler().catch(async (error) => {
    console.error('Aborted', error)
    process.exit(1)
})