import { Command } from 'commander';
import dotenv from 'dotenv';
import { JsonrpcHttpServer } from './modules/json-rpc/JsonRpcHttpServer';

dotenv.config();

async function runBundler() {

    const program = new Command()
    program
    .version('0.8.0')
    .option('--port <number>', 'server listening port', '3000')

    const programOpts = program.parse(process.argv).opts()
    console.log('command-line arguments: ', programOpts)

    const bundlerServer = new JsonrpcHttpServer(programOpts.port)
    await bundlerServer.start()
}

runBundler().catch(async (error) => {
    console.error('Aborted', error)
    process.exit(1)
})
