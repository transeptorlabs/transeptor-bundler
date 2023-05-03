# opnode-bundler
A modular Typescript implementation of an ERC-4337 Bundler.

See proposal here: https://hackmd.io/@V00D00-child/SyXKL6Kmn

## Local set up
1. install dependencies
```bash
npm install
```

2. start api
```bash
npm start
```

3. To test the API, you can use a tool like curl to send a JSON-RPC request:

```json
curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "method": "add", "params": [2, 3], "id": 1}' http://localhost:3000/rpc
```

```json
curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "method": "subtract", "params": [2, 3], "id": 1}' http://localhost:3000/rpc
```