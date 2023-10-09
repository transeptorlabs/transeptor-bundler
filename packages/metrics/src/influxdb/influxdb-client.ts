'use strict'

import os from 'os'
import { InfluxDB, Point } from '@influxdata/influxdb-client'
import { Logger } from 'logger'
import { MeasurementName } from 'types'

export class InfluxdbClient {
    private readonly org: string
    private readonly bucket: string
    private readonly influxDB: InfluxDB

    constructor(url: string, token: string, org: string, bucket: string) {
        this.bucket = bucket
        this.org = org
        this.influxDB = new InfluxDB({ url, token })
        Logger.debug('InfluxDB: initialized')
    }

    public async writePoint(measurement: string, fields: {value: number, name: MeasurementName}[]): Promise<void>{
        const writeApi = this.influxDB.getWriteApi(this.org, this.bucket)
        writeApi.useDefaultTags({ region: 'west' })
        const timestamp = new Date().getTime() * 1000000 // In nanoseconds!

        const point1 = new Point(measurement)
            .tag('host', os.hostname())
            .tag('node_id', 'TLM01')
            .timestamp(timestamp) // In nanoseconds!

        fields.forEach(field => {
            point1.floatField(field.name, field.value)
        })

        writeApi.writePoint(point1)
        Logger.debug(
            {
                point1
            },
            'InfluxDB: write point'
        )

        /**
         * Flush pending writes and close writeApi.
        **/
        await writeApi.close()
        Logger.debug('WRITE FINISHED')
    }
}