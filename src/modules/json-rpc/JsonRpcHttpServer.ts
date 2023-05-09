import express, { Request, Response } from "express"
import { createServer, Server } from "http"
import helmet from "helmet"
import cors from "cors"
import { RpcRequestHandler, JsonRpcRequest } from "./RpcRequestHandler"

export class JsonrpcHttpServer {
  private app: express.Application
  private readonly httpServer: Server
  private readonly PORT
  private readonly rpc: RpcRequestHandler = new RpcRequestHandler()

  constructor(readonly port: number, ) {
    this.app = express()
    this.app.use(
      helmet({
        referrerPolicy: { policy: "no-referrer-when-downgrade" },
      })
    )
    this.app.use(cors())
    this.app.use(express.json())

    this.app.post("/v1", this.handleRequest.bind(this))

    this.PORT = port
    this.httpServer = createServer(this.app)
  }

  private async preflightCheck(): Promise<void> {
    if (this.httpServer === undefined) {
      this.fatalError(new Error("httpServer is undefined"))
    }
  }

  async start(): Promise<void> {
    await this.preflightCheck()

    this.httpServer.listen(this.PORT, () => {
      console.log(`JSON-RPC server listening on port ${this.PORT}`)
    })
  }

  async stop(): Promise<void> {
    this.httpServer.close()
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const request = req.body as JsonRpcRequest
    const response = await this.rpc.doHandleRequest(request)
    res.json(response)
  }

  private fatalError(err: Error): void {
    console.error("FATAL:", err.message)
    process.exit(1)
  }
}
