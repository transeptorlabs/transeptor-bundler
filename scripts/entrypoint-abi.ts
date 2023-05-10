import { EntryPoint__factory } from '@account-abstraction/contracts'
const fs = require('fs')
const path = require('path')

async function main() {
  console.log("<<<<<--Running script to fetch entry point abi-->>>>>")
  const epAbBI = EntryPoint__factory.abi
  const jsonString = JSON.stringify(epAbBI, null, 2);
 
  const filePath = path.join(__dirname, '../abi/entrypoint.json')
  fs.writeFileSync(filePath, jsonString, "utf-8");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
})
