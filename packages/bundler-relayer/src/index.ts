import { createCommonEventManager } from './event/index.js'
import {
  createRelayerHandlerRegistry,
  createEthAPI,
  createWeb3API,
} from './handler/index.js'
import { createRpcServerWithHandlers } from '../../shared/rpc/index.js'
import { createProviderService } from '../../shared/provider/index.js'
import { Logger } from '../../shared/logger/index.js'
import { createRelayerConfig } from './config/index.js'
import { MetricsHttpServer, MetricsTracker } from './metrics/index.js'
import { createValidationService } from '../../shared/validatation/index.js'
import { createSimulator } from '../../shared/sim/sim.js'

const runBundlerRelayer = async () => {
  const args = process.argv
  const config = createRelayerConfig(args)

  const ps = createProviderService(config.provider)
  const sim = createSimulator(ps, config.entryPointContract)
  const vs = createValidationService(ps, sim, config.entryPointContract.address)

  // start rpc server
  const commonEventManager = createCommonEventManager(config.entryPointContract)
  const bundlerServer = createRpcServerWithHandlers(
    createRelayerHandlerRegistry(
      createEthAPI(
        ps,
        sim,
        vs,
        commonEventManager,
        config.entryPointContract,
        config.bundlerBuilderClientUrl,
        config.isUnsafeMode,
      ),
      createWeb3API(config.clientVersion, config.isUnsafeMode),
      config.bundlerBuilderClientUrl,
      ps,
    ),
    config.httpApis,
    config.port,
  )
  await bundlerServer.start(async () => {
    // TODO: Ping the bundler-builder node to make sure it is running before ready to take request
    // Make sure they are connected to the same network

    // full validation requires (debug_traceCall) method on eth node geth
    if (
      !config.isUnsafeMode &&
      !(await ps.supportsRpcMethod('debug_traceCall'))
    ) {
      throw new Error(
        'Full validation requires (debug_traceCall) method on eth node geth. For local UNSAFE mode: use --unsafe',
      )
    }
  })

  // stat metrics server
  if (config.isMetricsEnabled) {
    const metricsTracker = new MetricsTracker(config.influxdbConnection)
    const metricsServer = new MetricsHttpServer(config.metricsPort)

    await metricsServer.start()
    metricsTracker.startTracker()
  }
}

runBundlerRelayer().catch(async (error) => {
  Logger.fatal({ error: error.message }, 'Aborted')
  process.exit(1)
})
