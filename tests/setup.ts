import { loadEnvConfig } from '@next/env'
import { vi } from 'vitest'

const projectDir = process.cwd()
loadEnvConfig(projectDir)

// fall back to placeholder values for env-coupled clients that initialize at module load
process.env.NEXT_PUBLIC_E2B_DOMAIN ??= 'e2b-test.dev'

// mock server-only to prevent vitest errors
vi.mock('server-only', () => ({}))
vi.mock('server-cli-only', () => ({}))

// default mocks
vi.mock('@/core/shared/clients/logger', () => ({
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
