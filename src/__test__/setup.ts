import { loadEnvConfig } from '@next/env'
import { vi } from 'vitest'

// load env variables
const projectDir = process.cwd()
loadEnvConfig(projectDir)

// default mocks
vi.mock('@/lib/clients/logger', () => ({
  l: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))
