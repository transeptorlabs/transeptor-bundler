import { MockedObject, vi } from 'vitest'

import {
  CapabilityIssuer,
  CapabilityService,
  CapabilityVerifier,
} from '../../src/types/index.js'

export const mockCapabilityVerifier: MockedObject<CapabilityVerifier> = {
  verifyStateCapability: vi.fn(),
}

export const mockCapabilityIssuer: MockedObject<CapabilityIssuer> = {
  issueStateCapability: vi.fn(),
}

export const mockCapabilityService: MockedObject<CapabilityService> = {
  issueStateCapability: vi.fn(),
  verifyStateCapability: vi.fn(),
}
