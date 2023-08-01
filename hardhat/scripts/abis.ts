import { EntryPoint__factory, SimpleAccountFactory__factory, SimpleAccount__factory } from '@account-abstraction/contracts'
import fs from 'fs'
import path from 'path'

async function main() {
  console.log('<<<<<--Running script to fetch entry point and simple account factory abi-->>>>>')
  const epAbBI = EntryPoint__factory.abi
  const jsonString = JSON.stringify(epAbBI, null, 2)
 
  const epFilePath = path.join(__dirname, '../abi/entrypoint.json')
  fs.writeFileSync(epFilePath, jsonString, 'utf-8')

  const afAbBI = SimpleAccountFactory__factory.abi
  const afJsonString = JSON.stringify(afAbBI, null, 2)
 
  const afFilePath = path.join(__dirname, '../abi/simple-account-factory.json')
  fs.writeFileSync(afFilePath, afJsonString, 'utf-8')



  const saABI = SimpleAccount__factory.abi
  const ASJsonString = JSON.stringify(saABI, null, 2)

   
  const ASFilePath = path.join(__dirname, '../abi/simple-account.json')
  fs.writeFileSync(ASFilePath, ASJsonString, 'utf-8')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
})
