import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

import { Worker, isMainThread } from 'node:worker_threads'

import { Logger } from '../../../shared/logger/index.js'
import { InfluxdbConnection, WorkerMessage } from '../../../shared/types/index.js'

export class MetricsTracker {
    private interval: any| null = null
    private systemMetricsWorker: Worker | null = null
    private options: InfluxdbConnection
    private readonly intervalTime: number = 1000 // Run every second
    private startUsage: NodeJS.CpuUsage

    constructor(options: InfluxdbConnection) {
        this.options = options
        this.startUsage = process.cpuUsage()
    }

    public startTracker() {
        this.stopTracker()
        Logger.info(`Set metrics interval to report every ${1000} (ms)`)

        // create worker thread to process the metrics
        if (isMainThread) {
            const __filename = fileURLToPath(import.meta.url)
            const __dirname = dirname(__filename)
      
            const workerFilePath = join(__dirname, './workers/system-metrics-worker.js')
            this.systemMetricsWorker = new Worker(workerFilePath, {
                workerData: {
                    influxdbConnectionOptions: this.options,
                    startUsage: this.startUsage
                }
            })
    
            this.systemMetricsWorker.on('message', (message) => {
                if (message.success){
                    Logger.debug({message: 'Successfully calculated', success: true})
                } else{
                    Logger.debug({message: 'Calculation not possible', success: false})
                }
            })
            this.systemMetricsWorker.on('error', err => Logger.error(err))
            this.systemMetricsWorker.on('exit', code => Logger.debug(`Worker exited with code ${code}.`))

            this.interval = setInterval(() => {
                this.systemMetricsWorker.postMessage(WorkerMessage.COLLECT_SYSTEM_METRICS)
            }, this.intervalTime) 
        }
    }
    
    public stopTracker() {
        if (this.systemMetricsWorker) {
            this.systemMetricsWorker.terminate()
            this.systemMetricsWorker = null
            Logger.info('Stopping metrics tracker worker')
        }
        if (this.interval) {
            clearInterval(this.interval)
            this.interval = null
            Logger.info('Stopping metrics tracker interval')
        }
    }

    public isWorkerRunning(): boolean {
        return this.systemMetricsWorker !== null
    }
}
