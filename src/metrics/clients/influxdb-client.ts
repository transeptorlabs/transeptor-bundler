'use strict'
import os from 'os'

import { InfluxDB, Point } from '@influxdata/influxdb-client'

import {
  InfluxdbConnection,
  MeasurementName,
} from '../../types/metrics.types.js'
import { withReadonly } from '../../utils/index.js'

export type InfluxdbClient = {
  writePoint: (
    measurement: string,
    fields: { value: number; name: MeasurementName }[],
  ) => Promise<void>
}

/**
 * Creates an instance of the InfluxdbClient module.
 *
 * @param config - The configuration object for the InfluxdbClient instance.
 * @returns An instance of the InfluxdbClient module.
 */
function _createInfluxdbClient(
  config: Readonly<InfluxdbConnection>,
): InfluxdbClient {
  const { url, token, org, bucket } = config
  const influxDB: InfluxDB = new InfluxDB({ url, token })

  return {
    writePoint: async (
      measurement: string,
      fields: { value: number; name: MeasurementName }[],
    ): Promise<void> => {
      const writeApi = influxDB.getWriteApi(org, bucket)
      writeApi.useDefaultTags({ region: 'west' })
      const timestamp = new Date().getTime() * 1000000 // In nanoseconds!

      const point = new Point(measurement)
        .tag('host', os.hostname())
        .tag('node_id', 'transeptor')
        .timestamp(timestamp) // In nanoseconds!

      fields.forEach((field) => {
        point.floatField(field.name, field.value)
      })

      writeApi.writePoint(point)

      // Flush pending writes and close writeApi.
      await writeApi.close()
    },
  }
}

export const createInfluxdbClient = withReadonly<
  InfluxdbConnection,
  InfluxdbClient
>(_createInfluxdbClient)
