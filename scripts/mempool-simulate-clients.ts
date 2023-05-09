import {MempoolManager} from '../src/modules/MempoolManager'
import { MempoolEntry } from '../src/modules/Types'
import {mockUserOperationFactory, mockEntryPointGetUserOpHash} from '../utils/test-helpers'
/*
  In this script, we have a simulateClients function that represents the concurrent clients. Each client adds x items to the MempoolManager using the addUserOp method. The addPromises array is used to track the promises of concurrent add operations.
  After the items are added, the script sets up an interval using setInterval to call the createNextUserOpBundle() method every 10 seconds. 
  The removed items are then passed to the processItems function for simulation. The processItems function simulates a processing job with a 2-second delay before logging and processing the items.
  The script continues processing items until the mempool becomes empty, and then it stops the interval and logs a message indicating that all items have been processed.
*/
const clientCount = 6 // Number of concurrent clients

// Simulated processing job function
async function processItems(items: Array<[string, MempoolEntry]>): Promise<void> {
  // Simulated processing time (2 seconds)
  await new Promise((resolve) => setTimeout(resolve, 2000))
  console.log('Bundling UserOps:', items)
}

async function simulateClients(): Promise<void> {
  // Add UserOps to the hash table concurrently
  const addPromises = Array.from({ length: clientCount }, async (_, index) => {
    for (let i = 1; i <= clientCount / 2; i++) {
      const userOp = mockUserOperationFactory(`x000${index + 1}`, i)
      const key = mockEntryPointGetUserOpHash(userOp)
      await MempoolManager.getInstance().addUserOp(key, userOp)
      console.log(`Client ${index + 1} added UserOps: ${key}`)
    }
  })

  await Promise.all(addPromises)
  console.log('All items added to mempool:', MempoolManager.getInstance().size())

  const removeInterval = setInterval(async () => {
    const removedItems = await MempoolManager.getInstance().createNextUserOpBundle()
    await processItems(removedItems)

    if (MempoolManager.getInstance().size() === 0) {
      clearInterval(removeInterval)
      console.log('All UserOps in mempool processed')
    }
  }, 10000) // every 10 seconds
}

simulateClients().catch((error) => console.error('Error:', error))
