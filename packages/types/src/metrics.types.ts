export enum MeasurementName {
    FREE_MEMORY='free_memory',
    TOTAL_MEMORY='total_memory',
    USED_MEMORY='used_memory',
    MEMORY_USAGE='memory_usage', // Percentage

    FREE_DISK='free_disk',
    TOTAL_DISK='total_disk',
    USED_DISK='used_disk',
    DISK_USAGE='disk_usage', // Percentage

    CPU_USAGE='cpu_usage', // Percentage
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