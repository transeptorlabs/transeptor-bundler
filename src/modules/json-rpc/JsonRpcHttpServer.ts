import express, { Request, Response } from "express"
import { createServer, Server } from "http"
import helmet from "helmet"
import cors from "cors"
import { handleRequest, JsonRpcRequest } from "./requestHandler"

export class JsonrpcHttpServer {
  private app: express.Application
  private readonly httpServer: Server
  private readonly PORT

  constructor(readonly port: number) {
    this.app = express()
    this.app.use(
      helmet({
        referrerPolicy: { policy: "no-referrer-when-downgrade" },
      })
    )
    this.app.use(cors())
    this.app.use(express.json())

    this.app.post("/rpc", (req: Request, res: Response) => {
      const request = req.body as JsonRpcRequest
      const response = handleRequest(request)
      res.json(response)
    })

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

  private fatalError(err: Error): void {
    console.error("FATAL:", err.message)
    process.exit(1)
  }
}
