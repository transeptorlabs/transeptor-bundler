'use strict'

import { InfluxDB, Point } from '@influxdata/influxdb-client'
import { Logger } from 'logger'

export enum MeasurementName {
    CPU='cpu',
    MEMORY='memory',
    DISK='disk',
    NETWORK='network',
}

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

    public writePoint(value: number, measurementName: MeasurementName): void{
        const writeApi = this.influxDB.getWriteApi(this.org, this.bucket)
        writeApi.useDefaultTags({ region: 'west' })

        const point1 = new Point(measurementName)
            .tag('node_id', 'TLM01')
            .floatField('value', value)
            .timestamp(new Date().getTime() * 1000000) // In nanoseconds!
        console.log(` ${point1}`)

        writeApi.writePoint(point1)
        Logger.debug(
            {
                org: this.org,
                bucket: this.bucket,
                measurementName,
                value,
            },
            'InfluxDB: write point'
        )

        /**
         * Flush pending writes and close writeApi.
        **/
        writeApi.close().then(() => {
            Logger.debug('WRITE FINISHED')
        })
    }
}