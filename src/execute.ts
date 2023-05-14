import { JsonrpcHttpServer } from './modules/json-rpc/JsonRpcHttpServer'
import { Config } from './modules/Config'
import dotenv from 'dotenv'
import { ExecutionManager } from './modules/ExecutionManager'

dotenv.config()

async function runBundler() {

    // Register bundler components
    Config.getInstance()
    ExecutionManager.getInstance()

    // start the bundler server
    const bundlerServer = new JsonrpcHttpServer()
    await bundlerServer.start()
}

runBundler().catch(async (error) => {
    console.error('Aborted', error)
    process.exit(1)
})