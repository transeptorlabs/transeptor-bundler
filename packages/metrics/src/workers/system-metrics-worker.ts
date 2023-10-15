import { parentPort, workerData } from 'worker_threads'
import osUtils from 'os-utils'
import { InfluxdbClient } from '../influxdb'
import { MeasurementName, InfluxdbConnection, WorkerMessage } from 'types'

parentPort.on('message', async (message) => {
  if (message === WorkerMessage.COLLECT_SYSTEM_METRICS) {
    try {
      await collectAndStoreSystemMetrics()
  
      // Send a confirmation message to the parent
      parentPort.postMessage({message: 'Successfully collect metrics', success: true})
    } catch (error) {
      parentPort.postMessage({message: 'Failed to collect metrics', success: false})
      throw error
    }
  }
})

async function collectAndStoreSystemMetrics() {
  const options = workerData.influxdbConnectionOptions as InfluxdbConnection
  const client = new InfluxdbClient(
    options.url,
    options.token,
    options.org,
    options.bucket,
  )
  const cpuUsage = await getCpuUsage()
  const {total, free} = await getDiskUsage()
  const freeMem = osUtils.freemem() 
  const totalMem = osUtils.totalmem()
  const memoryUsage = (((totalMem - freeMem) / totalMem) * 100)
  const diskUsage = (((total - free) / total) * 100)

  await client.writePoint(
    'system_metrics',
    [
      { 
        name: MeasurementName.CPU_USAGE,
        value: cpuUsage // Percentage
      },
      { 
        name: MeasurementName.MEMORY_USAGE,
        value: memoryUsage // Percentage
      },
      { 
        name: MeasurementName.FREE_MEMORY,
        value: freeMem / 1024 // convert to GB
      },
      { 
        name: MeasurementName.TOTAL_MEMORY,
        value: totalMem / 1024 // convert to GB
      },
      { 
        name: MeasurementName.DISK_USAGE,
        value: diskUsage // Percentage
      },
      { 
        name: MeasurementName.FREE_DISK,
        value: free
      },
      { 
        name: MeasurementName.TOTAL_DISK,
        value: total
      }
    ]
  )
}

async function getCpuUsage(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    osUtils.cpuUsage((usage) => {
      if (usage !== null) {
        const cpuUsage = usage * 100 // Convert to percentage
        resolve(cpuUsage)
      } else {
        reject(new Error('Unable to get CPU usage.'))
      }
    })
  })
}

async function getDiskUsage(): Promise<{total: number, free: number, used: number}> {
  return new Promise<{total: number, free: number, used: number}>((resolve, reject) => {
    osUtils.harddrive((total, free, used) => {
      if (total !== null && free !== null && used !== null) {
        resolve({
            total: total,
            free: free,
            used: used
        })
      } else {
        reject(new Error('Unable to get Disk usage.'))
      }
    })
  })
} 