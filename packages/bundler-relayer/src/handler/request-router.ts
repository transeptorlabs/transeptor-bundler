import { providers } from "ethers"

export const routeRequest = async (bundlerBuilderClientUrl: string, method: string, params: any[]) => {
    const provider = new providers.StaticJsonRpcProvider(bundlerBuilderClientUrl)
    // TODO: We can catch error and extract error message
    return await provider.send(method, params)
}