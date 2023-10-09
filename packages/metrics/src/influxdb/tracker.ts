import osUtils from 'os-utils'
import os from 'os'
import { InfluxdbClient } from "./influxdb-client"
import { Logger } from 'logger'
import { MeasurementName, InfluxdbConnection } from 'types'

export class PerformanceTracker {
    private interval: any| null = null
    private client: InfluxdbClient

    constructor(options: InfluxdbConnection) {
        this.client = new InfluxdbClient(
            options.url,
            options.token,
            options.org,
            options.bucket,
        )
    }

    private async report() {
        await this.collectAndStoreSystemMetrics()
    }

    public startTracker() {
        this.stopTrackerCron()
        Logger.info(`Set metrics interval to report every ${1000} (ms)`)
        this.interval = setInterval(this.report.bind(this), 1000) // evey second
    }
    
    public stopTrackerCron() {
        if (this.interval) {
            clearInterval(this.interval)
            this.interval = null
            Logger.info('Stopping reputation interval')
        }
    }

    private async collectAndStoreSystemMetrics() {
        const memoryUsage = (1 - (os.freemem() / os.totalmem())) * 100; // Calculate memory usage percentage

        osUtils.cpuUsage(async (usage) => {
          const cpuUsage = usage * 100; // Convert to percentage
          await this.client.writePoint(
            'system_metrics',
            [
                { 
                    name: MeasurementName.CPU,
                    value: cpuUsage
                },
                { 
                    name: MeasurementName.MEMORY,
                    value: memoryUsage
                }
            ])
        });
    }
}