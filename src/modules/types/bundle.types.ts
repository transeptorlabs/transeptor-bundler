export interface SlotMap {
    [slot: string]: string
}
  
/**
 * map of storage
 * for each address, either a root hash, or a map of slot:value
 */
export interface StorageMap {
    [address: string]: string | SlotMap
}

export interface SendBundleReturn {
    transactionHash: string
    userOpHashes: string[]
}