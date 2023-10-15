export enum MeasurementName {
    FREE_MEMORY='free_memory',
    TOTAL_MEMORY='total_memory',
    MEMORY_USAGE='memory_usage',
    FREE_DISK='free_disk',
    TOTAL_DISK='total_disk',
    DISK_USAGE='disk_usage',
    CPU_USAGE='cpu_usage',
    NETWORK='network_usage',
}

export type InfluxdbConnection = {
    url: string
    org: string
    bucket: string
    token: string
}

export enum WorkerMessage {
    COLLECT_SYSTEM_METRICS='Collect system metrics'
}