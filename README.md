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

```curl
curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "method": "eth_sendUserOperation", "params": [], "id": 1}' http://localhost:3000/v1
```

```curl
curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "method": "subtract", "params": [2, 3], "id": 1}' http://localhost:3000/v1
```

## Common RPC error codes
-32700: Parse error - Invalid JSON was received by the server.
-32600: Invalid Request - The JSON sent is not a valid JSON-RPC request object.
-32601: Method not found - The method does not exist or is not available.
-32602: Invalid params - Invalid method parameters.
-32603: Internal error - An internal error occurred while processing the request.
-32000 to -32099: Server error - Reserved for implementation-defined server errors.