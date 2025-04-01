import { vi } from 'vitest'
import type { Server } from 'http'

class MockHttpServerClass {
  listen = vi.fn().mockImplementation((port: number, callback?: () => void) => {
    if (callback) callback()
    return this
  })

  close = vi.fn().mockImplementation((callback?: (err?: Error) => void) => {
    if (callback) {
      setTimeout(() => callback(), 0)
    }
    return this
  })

  on = vi.fn().mockReturnValue(this)
  emit = vi.fn().mockReturnValue(this)
  address = vi.fn().mockReturnValue({ port: 3000 })
}

export const mockHttpServer = new MockHttpServerClass() as unknown as Server & {
  listen: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  emit: ReturnType<typeof vi.fn>
  address: ReturnType<typeof vi.fn>
}

export const createServerMock = () => {
  return mockHttpServer
}
