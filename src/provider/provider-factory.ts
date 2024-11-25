import { JsonRpcProvider } from 'ethers'

const isValidUrl = (url: string): boolean => {
  const pattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/
  return pattern.test(url)
}

export const createProvider = (url: string): JsonRpcProvider => {
  const isValid = isValidUrl(url)
  if (!isValid) {
    throw new Error('Invalid network URL')
  }
  return new JsonRpcProvider(url)
}
