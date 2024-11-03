import osUtils from 'os-utils'
import { Logger } from '../logger/index.js'
import { InfluxdbConnection, MeasurementName } from './metrics.types.js'
import { createInfluxdbClient } from './influxdb/index.js'

export type MetricsTracker = {
  startTracker: () => void
  stopTracker: () => void
}

export const createMetricsTracker = (
  options: InfluxdbConnection,
): MetricsTracker => {
  const intervalTime = 1000 // Run every second
  const startUsage: NodeJS.CpuUsage = process.cpuUsage()
  const client = createInfluxdbClient(
    options.url,
    options.token,
    options.org,
    options.bucket,
  )
  let interval: NodeJS.Timer | null = null

  const getCpuUsage = async (): Promise<number> => {
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

  const getDiskUsage = async (): Promise<{
    diskTotal: number
    diskFree: number
    diskUsed: number
  }> => {
    return new Promise<{
      diskTotal: number
      diskFree: number
      diskUsed: number
    }>((resolve, reject) => {
      osUtils.harddrive((total, free, used) => {
        if (total !== null && free !== null && used !== null) {
          resolve({
            diskTotal: total,
            diskFree: free,
            diskUsed: used,
          })
        } else {
          reject(new Error('Unable to get Disk usage.'))
        }
      })
    })
  }

  const collectAndStoreSystemMetrics = async () => {
    Logger.debug('Collecting and storing system metrics')
    // CPU (system)
    const cpuUsagePerc = await getCpuUsage()
    const cpuCount = osUtils.cpuCount()

    // in MB (system)
    const freeMem = osUtils.freemem()
    const totalMem = osUtils.totalmem()
    const usedMem = totalMem - freeMem
    const memoryUsagePerc = ((totalMem - freeMem) / totalMem) * 100

    // in MB (system)
    const { diskTotal, diskFree, diskUsed } = await getDiskUsage()
    const diskUsagePerc = ((diskTotal - diskFree) / diskTotal) * 100

    /* alloc, used, held, external (process) in MB
      rss(alloc): Resident Set Size, the total memory allocated for the process.
      heapTotal(held): Total heap size, which includes both heapUsed and other internal memory management structures.
      heapUsed(used): Heap memory used by the application.
      external: Memory used by JavaScript objects bound to C++ objects (e.g., Buffers).
    */
    const memoryUsageProcess = process.memoryUsage()
    const Mb = 1024 * 1024

    // cpu usage as a percentage (process) in %
    const endUsage = process.cpuUsage(startUsage)
    const userUsageInSeconds = endUsage.user / 1e6 // Convert to seconds
    const systemUsageInSeconds = endUsage.system / 1e6 // Convert to seconds

    const totalUserCpuUsagePerc = (userUsageInSeconds / process.uptime()) * 100
    const totalSystemCpuUsagePerc =
      (systemUsageInSeconds / process.uptime()) * 100

    await client.writePoint('system_metrics', [
      //  Process metrics
      {
        name: MeasurementName.ALLOC,
        value: Math.floor(memoryUsageProcess.rss / Mb),
      },
      {
        name: MeasurementName.HELD,
        value: Math.floor(memoryUsageProcess.heapTotal / Mb),
      },
      {
        name: MeasurementName.USED,
        value: Math.floor(memoryUsageProcess.heapUsed / Mb),
      },
      {
        name: MeasurementName.USER_CPU_USAGE,
        value: Math.floor(memoryUsageProcess.external / Mb),
      },
      {
        name: MeasurementName.SYSTEM_CPU_USAGE,
        value: totalUserCpuUsagePerc,
      },
      {
        name: MeasurementName.EXTERNAL,
        value: totalSystemCpuUsagePerc,
      },
      // System metrics cpu
      {
        name: MeasurementName.CPU_COUNT,
        value: cpuCount,
      },
      {
        name: MeasurementName.CPU_USAGE,
        value: cpuUsagePerc,
      },
      // System metrics memory
      {
        name: MeasurementName.MEMORY_USAGE,
        value: memoryUsagePerc,
      },
      {
        name: MeasurementName.USED_MEMORY,
        value: usedMem / 1024, // convert to GB
      },
      {
        name: MeasurementName.FREE_MEMORY,
        value: freeMem / 1024, // convert to GB
      },
      {
        name: MeasurementName.TOTAL_MEMORY,
        value: totalMem / 1024, // convert to GB
      },
      // System metrics disk
      {
        name: MeasurementName.DISK_USAGE,
        value: diskUsagePerc,
      },
      {
        name: MeasurementName.USED_DISK,
        value: diskUsed / 1024, // convert to GB
      },
      {
        name: MeasurementName.FREE_DISK,
        value: diskFree / 1024, // convert to GB
      },
      {
        name: MeasurementName.TOTAL_DISK,
        value: diskTotal / 1024, // convert to GB
      },
    ])
  }

  const stopTracker = () => {
    if (interval) {
      clearInterval(interval)
      interval = null
      Logger.info('Stopping metrics tracker interval')
    }
  }

  return {
    startTracker: () => {
      stopTracker()
      Logger.info(`Set metrics interval to report every ${1000} (ms)`)
      interval = setInterval(async () => {
        await collectAndStoreSystemMetrics()
      }, intervalTime)
    },

    stopTracker,
  }
}
