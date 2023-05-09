import { Command } from 'commander'
import dotenv from 'dotenv'
import { JsonrpcHttpServer } from './modules/json-rpc/JsonRpcHttpServer'
import { RpcRequestHandler } from './modules/json-rpc/RpcRequestHandler'
import { DebugMethodHandler } from './modules/json-rpc/DebugMethodHandler'
import { UserOpMethodHandler } from './modules/json-rpc/UserOpMethodHandler'
import { Config } from './modules/Config'

dotenv.config()

async function runBundler() {

    const program = new Command()
    program
    .version('0.8.0')
    .option('--port <number>', 'server listening port', '3000')
    .option('--mnemonic <file>', 'mnemonic/private-key file of signer account')
    .option('--config <string>', 'path to config file', 'workdir/bundler.config.json')
    
    const programOpts = program.parse(process.argv).opts()
    console.log('command-line arguments: ', programOpts)
    Config.getInstance(programOpts)

    // start the bundler server
    const handeler = new RpcRequestHandler(
        new UserOpMethodHandler(),
        new DebugMethodHandler()
    )

    const bundlerServer = new JsonrpcHttpServer(programOpts.port, handeler)
    await bundlerServer.start()
}

runBundler().catch(async (error) => {
    console.error('Aborted', error)
    process.exit(1)
})
