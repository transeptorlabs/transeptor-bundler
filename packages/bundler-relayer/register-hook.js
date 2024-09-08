// ESM module customization hook for running node during development: https://nodejs.org/api/module.html#customization-hooks
import { register } from "node:module"; 
import { pathToFileURL } from "node:url"; 

register("ts-node/esm", pathToFileURL("./"));