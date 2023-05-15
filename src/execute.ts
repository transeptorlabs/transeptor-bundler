import { JsonrpcHttpServer } from './modules/json-rpc/JsonRpcHttpServer'
import Config from './modules/Config'
import dotenv from 'dotenv'
import { ExecutionManager } from './modules/ExecutionManager'

dotenv.config()

async function runBundler() {
    // init config global
    Config

    // start the bundler server
    ExecutionManager.getInstance()
    const bundlerServer = new JsonrpcHttpServer()
    await bundlerServer.start()
}

runBundler().catch(async (error) => {
    console.error('Aborted', error)
    process.exit(1)
})