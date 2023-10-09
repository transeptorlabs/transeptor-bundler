export enum MeasurementName {
    CPU='cpu_usage',
    MEMORY='memory_usage',
    DISK='disk_usage',
    NETWORK='network_usage',
}

export type InfluxdbConnection = {
    url: string
    org: string
    bucket: string
    token: string
}