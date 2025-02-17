export enum MeasurementName {
  // Process metrics
  ALLOC = 'alloc',
  HELD = 'held',
  USED = 'used',
  EXTERNAL = 'external',
  USER_CPU_USAGE = 'user_cpu', // Percentage
  SYSTEM_CPU_USAGE = 'system_cpu', // Percentage

  // System metrics memory
  FREE_MEMORY = 'free_memory',
  TOTAL_MEMORY = 'total_memory',
  USED_MEMORY = 'used_memory',
  MEMORY_USAGE = 'memory_usage', // Percentage

  // System metrics disk
  FREE_DISK = 'free_disk',
  TOTAL_DISK = 'total_disk',
  USED_DISK = 'used_disk',
  DISK_USAGE = 'disk_usage', // Percentage

  // System metrics cpu
  CPU_COUNT = 'cpu_count',
  CPU_USAGE = 'cpu_usage', // Percentage
}

export type InfluxdbConnection = {
  url: string
  org: string
  bucket: string
  token: string
}

export enum WorkerMessage {
  COLLECT_SYSTEM_METRICS = 'Collect system metrics',
}
