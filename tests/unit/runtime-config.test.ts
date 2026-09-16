import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  resolveBrowserRuntimeConfig,
  resolveDashboardApiUrl,
  resolveE2BDomain,
  resolveInfraApiUrl,
  resolveSandboxUrl,
} from '@/core/server/runtime-config'

beforeEach(() => {
  for (const key of [
    'PUBLIC_SANDBOX_URL',
    'E2B_INFRA_API_URL',
    'E2B_DASHBOARD_API_URL',
    'E2B_SANDBOX_URL',
    'NEXT_PUBLIC_INFRA_API_URL',
    'NEXT_PUBLIC_DASHBOARD_API_URL',
    'NEXT_PUBLIC_E2B_SANDBOX_URL',
    'NEXT_PUBLIC_E2B_DOMAIN',
  ])
    vi.stubEnv(key, undefined)
  vi.stubEnv('PUBLIC_E2B_DOMAIN', 'example.dev')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('runtime configuration', () => {
  it('reads the public domain at runtime for the browser and both API defaults', () => {
    for (const domain of ['first.example', 'second.example']) {
      vi.stubEnv('PUBLIC_E2B_DOMAIN', ` ${domain} `)
      expect(resolveE2BDomain()).toBe(domain)
      expect(resolveInfraApiUrl()).toBe(`https://api.${domain}`)
      expect(resolveDashboardApiUrl()).toBe(`https://dashboard-api.${domain}`)
      expect(resolveBrowserRuntimeConfig()).toEqual({
        domain,
        sandboxUrl: null,
      })
    }
  })

  it('requires a runtime domain instead of using the legacy build value', () => {
    vi.stubEnv('PUBLIC_E2B_DOMAIN', undefined)
    vi.stubEnv('NEXT_PUBLIC_E2B_DOMAIN', 'build.example')
    expect(() => resolveE2BDomain()).toThrow(/PUBLIC_E2B_DOMAIN/)
  })

  it.each([
    ['E2B_INFRA_API_URL', resolveInfraApiUrl, 'https://api.example.dev'],
    [
      'E2B_DASHBOARD_API_URL',
      resolveDashboardApiUrl,
      'https://dashboard-api.example.dev',
    ],
    ['PUBLIC_SANDBOX_URL', resolveSandboxUrl, undefined],
  ] as const)('uses the runtime override for %s and its default when blank', (key, resolve, fallback) => {
    vi.stubEnv(key, ' http://127.0.0.1:3002 ')
    expect(resolve()).toBe('http://127.0.0.1:3002')
    vi.stubEnv(key, '   ')
    expect(resolve()).toBe(fallback)
    vi.stubEnv(key, 'ftp://sandbox.example')
    expect(() => resolve()).toThrow(key)
  })

  it('rejects the deprecated SDK alias before it can select a different server destination', () => {
    vi.stubEnv('E2B_SANDBOX_URL', 'https://old.example')
    expect(() => resolveSandboxUrl()).toThrow(/PUBLIC_SANDBOX_URL/)
    expect(() => resolveBrowserRuntimeConfig()).toThrow(/PUBLIC_SANDBOX_URL/)
  })

  it('exposes only the domain and sandbox URL, with no server endpoints or credentials', () => {
    vi.stubEnv('PUBLIC_E2B_DOMAIN', 'runtime.example')
    vi.stubEnv('PUBLIC_SANDBOX_URL', 'https://sandbox.runtime.example')
    vi.stubEnv('E2B_INFRA_API_URL', 'http://infra-api.internal:3000')
    vi.stubEnv('E2B_DASHBOARD_API_URL', 'http://dashboard-api.internal:3010')
    vi.stubEnv('E2B_API_KEY', 'e2b_test_private_key')
    expect(resolveBrowserRuntimeConfig()).toEqual({
      domain: 'runtime.example',
      sandboxUrl: 'https://sandbox.runtime.example',
    })
    expect(resolveBrowserRuntimeConfig().sandboxUrl).toBe(resolveSandboxUrl())
  })

  it('keeps SDK domain routing when API overrides are set without a sandbox URL', () => {
    vi.stubEnv('E2B_INFRA_API_URL', 'http://127.0.0.1:3000')
    expect(resolveSandboxUrl()).toBeUndefined()
    expect(resolveBrowserRuntimeConfig()).toEqual({
      domain: 'example.dev',
      sandboxUrl: null,
    })
  })
})
