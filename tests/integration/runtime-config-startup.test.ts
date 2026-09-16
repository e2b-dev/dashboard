import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { register } from '@/instrumentation'

vi.mock('@vercel/otel', () => ({ registerOTel: vi.fn() }))

const URL_KEYS = [
  'PUBLIC_SANDBOX_URL',
  'E2B_INFRA_API_URL',
  'E2B_DASHBOARD_API_URL',
] as const

const DEPRECATED_KEYS = [
  'NEXT_PUBLIC_E2B_DOMAIN',
  'NEXT_PUBLIC_INFRA_API_URL',
  'NEXT_PUBLIC_DASHBOARD_API_URL',
  'NEXT_PUBLIC_E2B_SANDBOX_URL',
  'E2B_SANDBOX_URL',
] as const

beforeEach(() => {
  vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit(${code})`)
  })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.stubEnv('PUBLIC_E2B_DOMAIN', 'cluster.example')
  for (const key of DEPRECATED_KEYS) vi.stubEnv(key, undefined)
  vi.stubEnv('NEXT_RUNTIME', 'nodejs')
  vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', '')
  vi.stubEnv('DASHBOARD_COOKIE_SECURE', '')
  for (const key of URL_KEYS) vi.stubEnv(key, '')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

async function expectStartupFailure(variable: string) {
  await expect(register()).rejects.toThrow('process.exit(1)')
  expect(process.exit).toHaveBeenCalledWith(1)
  expect(console.error).toHaveBeenCalledWith(expect.stringContaining(variable))
}

describe('runtime configuration at server startup', () => {
  it.each(
    URL_KEYS
  )('rejects invalid %s with telemetry disabled', async (key) => {
    vi.stubEnv(key, 'missing-scheme.example:3002')

    await expectStartupFailure(key)
  })

  it.each([
    undefined,
    '',
    '   ',
  ])('rejects a missing or blank runtime domain: %s', async (value) => {
    vi.stubEnv('PUBLIC_E2B_DOMAIN', value)
    await expectStartupFailure('PUBLIC_E2B_DOMAIN')
  })

  it.each(
    DEPRECATED_KEYS
  )('rejects deprecated %s even with valid runtime settings', async (key) => {
    vi.stubEnv(key, 'https://old.example')
    await expectStartupFailure(key)
  })

  it('rejects an invalid cookie flag with telemetry disabled', async () => {
    vi.stubEnv('DASHBOARD_COOKIE_SECURE', 'off')

    await expectStartupFailure('DASHBOARD_COOKIE_SECURE')
  })

  it('accepts a valid runtime configuration with telemetry disabled', async () => {
    vi.stubEnv('PUBLIC_SANDBOX_URL', 'https://sandbox.example')
    vi.stubEnv('E2B_INFRA_API_URL', 'http://127.0.0.1:3000')
    vi.stubEnv('E2B_DASHBOARD_API_URL', 'http://127.0.0.1:3010')
    vi.stubEnv('DASHBOARD_COOKIE_SECURE', ' false ')

    await expect(register()).resolves.toBeUndefined()
    expect(process.exit).not.toHaveBeenCalled()
  })

  it('allows SDK domain routing with no sandbox override', async () => {
    await expect(register()).resolves.toBeUndefined()
    expect(process.exit).not.toHaveBeenCalled()
  })
})
