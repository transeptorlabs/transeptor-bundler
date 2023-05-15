import { JsonrpcHttpServer } from './modules/json-rpc/JsonRpcHttpServer'
import Config from './modules/Config'
import ExecutionManager  from './modules/ExecutionManager'

async function runBundler() {
    // init globals
    Config
    ExecutionManager

    // // start the bundler server
    const bundlerServer = new JsonrpcHttpServer()
    await bundlerServer.start()
}

runBundler().catch(async (error) => {
    console.error('Aborted', error)
    process.exit(1)
})