import { loadEnvConfig } from '@next/env'
import { vi } from 'vitest'

const projectDir = process.cwd()
loadEnvConfig(projectDir)

// fall back to placeholder values for env-coupled clients that initialize at module load
process.env.ORY_SDK_URL ??= 'https://test-ory.projects.oryapis.com'
process.env.ORY_OAUTH2_CLIENT_ID ??= 'test-ory-client-id'
process.env.ORY_OAUTH2_CLIENT_SECRET ??= 'test-ory-client-secret'
process.env.ORY_OAUTH2_AUDIENCE ??= 'https://api.e2b-test.dev'
process.env.ORY_PROJECT_API_TOKEN ??= 'test-ory-project-api-token'

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
