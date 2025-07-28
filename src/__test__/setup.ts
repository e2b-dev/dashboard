import { loadEnvConfig } from '@next/env'
import { vi } from 'vitest'

// load env variables
const projectDir = process.cwd()
loadEnvConfig(projectDir)

// default mocks
vi.mock('@/lib/clients/logger', () => ({
  l: {
    error: console.error,
    info: console.info,
    warn: console.warn,
    debug: console.info,
  },
  logger: {
    error: console.error,
    info: console.info,
    warn: console.warn,
    debug: console.info,
  },
  default: {
    error: console.error,
    info: console.info,
    warn: console.warn,
    debug: console.info,
  },
}))
