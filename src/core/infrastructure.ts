import {
  createAuditLogger,
  createAuditLogQueue,
  createAuditLogWriter,
  withModuleContext,
} from '../logger/index.js'
import {
  createInfluxdbClient,
  createMetricsTracker,
  MetricsTracker,
} from '../metrics/index.js'
import {
  AuditLogger,
  InfluxdbConnection,
  TranseptorLogger,
} from '../types/index.js'

export type Infrastructure = {
  auditLogger: AuditLogger
  metricsTracker: MetricsTracker | undefined
}

export type InfrastructureConfig = {
  logger: TranseptorLogger
  destinationPath: string
  auditLogFlushIntervalMs: number
  bufferCapacity: number
  clientVersion: string
  nodeCommitHash: string
  environment: string
  isMetricsEnabled: boolean
  influxdbConnection: InfluxdbConnection
}

export const createInfrastructure = (
  config: InfrastructureConfig,
): Infrastructure => {
  const {
    logger,
    destinationPath,
    auditLogFlushIntervalMs,
    bufferCapacity,
    influxdbConnection,
    clientVersion,
    nodeCommitHash,
    environment,
    isMetricsEnabled,
  } = config
  logger.info('Initializing infrastructure')

  const auditLogger = createAuditLogger({
    auditLogQueue: createAuditLogQueue({
      auditLogWriter: createAuditLogWriter({
        backend: 'pino',
        destinationPath,
        logger: withModuleContext('audit-log-writer', logger),
      }),
      flushIntervalMs: auditLogFlushIntervalMs,
      logger: withModuleContext('audit-log-queue', logger),
      bufferCapacity,
    }),
    clientVersion,
    nodeCommitHash,
    environment,
  })

  const metricsTracker = isMetricsEnabled
    ? createMetricsTracker({
        logger: withModuleContext('metrics-tracker', logger),
        influxdbClient: createInfluxdbClient(influxdbConnection),
      })
    : undefined

  return {
    auditLogger,
    metricsTracker,
  }
}
