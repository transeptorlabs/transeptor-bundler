import { MempoolEntry } from '../types'

/*
    BundleProcessor: This class will attempt to process(send) userOperations as bundles
*/
export class BundleProcessor {
    constructor() {
        //
    }

    /*
      submit a bundle. After submitting the bundle, remove the remove UserOps from the mempool 
    */
    async sendNextBundle (entries: MempoolEntry[]): Promise<string> {
        console.log('sendNextBundle:', entries.length, entries)
        return 'transactionHash'
    }
}