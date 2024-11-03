import { providers } from 'ethers'

export const createProvider = (
  url: string,
  apiKey?: string,
): providers.JsonRpcProvider => {
  const isValid = isValidUrl(url)
  if (!isValid) {
    throw new Error('Invalid network URL')
  }
  return apiKey
    ? new providers.JsonRpcProvider(`${url.replace(/\/+$/, '')}/${apiKey}`)
    : new providers.JsonRpcProvider(url)
}

const isValidUrl = (url: string): boolean => {
  const pattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/
  return pattern.test(url)
}
