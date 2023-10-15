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
    }

    public async writePoint(measurement: string, fields: {value: number, name: MeasurementName}[]): Promise<void>{
        const writeApi = this.influxDB.getWriteApi(this.org, this.bucket)
        writeApi.useDefaultTags({ region: 'west' })
        const timestamp = new Date().getTime() * 1000000 // In nanoseconds!

        const point = new Point(measurement)
            .tag('host', os.hostname())
            .tag('node_id', 'transeptor')
            .timestamp(timestamp) // In nanoseconds!

        fields.forEach(field => {
            point.floatField(field.name, field.value)
        })

        writeApi.writePoint(point)
        Logger.debug(
            {
                point
            },
            'InfluxDB: writing point'
        )

        /**
         * Flush pending writes and close writeApi.
        **/
        await writeApi.close()
    }
}