import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  resolveBrowserRuntimeConfig,
  resolveDashboardApiUrl,
  resolveE2BDomain,
  resolveInfraApiUrl,
  resolveSandboxUrl,
} from '@/core/server/runtime-config'

const MANAGED_KEYS = [
  'PUBLIC_E2B_DOMAIN',
  'PUBLIC_SANDBOX_URL',
  'E2B_API_KEY',
  'E2B_INFRA_API_URL',
  'E2B_DASHBOARD_API_URL',
  'E2B_SANDBOX_URL',
  'NEXT_PUBLIC_INFRA_API_URL',
  'NEXT_PUBLIC_DASHBOARD_API_URL',
  'NEXT_PUBLIC_E2B_SANDBOX_URL',
  'NEXT_PUBLIC_E2B_DOMAIN',
] as const

const saved = new Map<string, string | undefined>()

beforeEach(() => {
  for (const key of MANAGED_KEYS) {
    saved.set(key, process.env[key])
    delete process.env[key]
  }
  process.env.NEXT_PUBLIC_E2B_DOMAIN = 'example.dev'
})

afterEach(() => {
  for (const key of MANAGED_KEYS) {
    const value = saved.get(key)
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
})

describe('resolveE2BDomain', () => {
  it('falls back to the legacy build-time domain', () => {
    expect(resolveE2BDomain()).toBe('example.dev')
  })

  it('reads the public domain at runtime for both API defaults', () => {
    for (const domain of ['first.example', 'second.example']) {
      process.env.PUBLIC_E2B_DOMAIN = ` ${domain} `
      expect(resolveE2BDomain()).toBe(domain)
      expect(resolveInfraApiUrl()).toBe(`https://api.${domain}`)
      expect(resolveDashboardApiUrl()).toBe(`https://dashboard-api.${domain}`)
      expect(resolveBrowserRuntimeConfig()).toEqual({
        domain,
        sandboxUrl: null,
      })
    }
  })

  it('ignores an empty public domain', () => {
    process.env.PUBLIC_E2B_DOMAIN = '   '
    expect(resolveE2BDomain()).toBe('example.dev')
  })
})

describe('resolveInfraApiUrl', () => {
  it('derives the URL from the domain when nothing is set', () => {
    expect(resolveInfraApiUrl()).toBe('https://api.example.dev')
  })

  it('falls back to the NEXT_PUBLIC override', () => {
    process.env.NEXT_PUBLIC_INFRA_API_URL = 'https://api.public.example'

    expect(resolveInfraApiUrl()).toBe('https://api.public.example')
  })

  it('prefers the runtime variable over the NEXT_PUBLIC override', () => {
    process.env.NEXT_PUBLIC_INFRA_API_URL = 'https://api.public.example'
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'

    expect(resolveInfraApiUrl()).toBe('http://127.0.0.1:3000')
  })

  it('ignores an empty runtime variable', () => {
    process.env.E2B_INFRA_API_URL = ''
    process.env.NEXT_PUBLIC_INFRA_API_URL = 'https://api.public.example'

    expect(resolveInfraApiUrl()).toBe('https://api.public.example')
  })

  it('ignores a whitespace-only runtime variable', () => {
    process.env.E2B_INFRA_API_URL = '   '
    process.env.NEXT_PUBLIC_INFRA_API_URL = 'https://api.public.example'

    expect(resolveInfraApiUrl()).toBe('https://api.public.example')
  })

  it('trims whitespace around the resolved value', () => {
    process.env.E2B_INFRA_API_URL = '  http://127.0.0.1:3000\n'

    expect(resolveInfraApiUrl()).toBe('http://127.0.0.1:3000')
  })
})

describe('resolveDashboardApiUrl', () => {
  it('derives the URL from the domain when nothing is set', () => {
    expect(resolveDashboardApiUrl()).toBe('https://dashboard-api.example.dev')
  })

  it('falls back to the NEXT_PUBLIC override', () => {
    process.env.NEXT_PUBLIC_DASHBOARD_API_URL = 'https://dash.public.example'

    expect(resolveDashboardApiUrl()).toBe('https://dash.public.example')
  })

  it('prefers the runtime variable over the NEXT_PUBLIC override', () => {
    process.env.NEXT_PUBLIC_DASHBOARD_API_URL = 'https://dash.public.example'
    process.env.E2B_DASHBOARD_API_URL = 'http://127.0.0.1:3010'

    expect(resolveDashboardApiUrl()).toBe('http://127.0.0.1:3010')
  })

  it('ignores an empty runtime variable', () => {
    process.env.E2B_DASHBOARD_API_URL = ''
    process.env.NEXT_PUBLIC_DASHBOARD_API_URL = 'https://dash.public.example'

    expect(resolveDashboardApiUrl()).toBe('https://dash.public.example')
  })
})

describe('resolveSandboxUrl', () => {
  it('prefers the public sandbox URL over both legacy aliases', () => {
    process.env.PUBLIC_SANDBOX_URL = ' https://sandbox.runtime.example '
    process.env.E2B_SANDBOX_URL = 'https://sandbox.old.example'
    process.env.NEXT_PUBLIC_E2B_SANDBOX_URL = 'https://sandbox.build.example'

    expect(resolveSandboxUrl()).toBe('https://sandbox.runtime.example')
  })

  it('falls back to the runtime alias when the public value is blank', () => {
    process.env.PUBLIC_SANDBOX_URL = '   '
    process.env.E2B_SANDBOX_URL = 'https://sandbox.old.example'

    expect(resolveSandboxUrl()).toBe('https://sandbox.old.example')
  })

  it('rejects an invalid public URL instead of falling back silently', () => {
    process.env.PUBLIC_SANDBOX_URL = 'sandbox.runtime.example:3002'
    process.env.E2B_SANDBOX_URL = 'https://sandbox.old.example'

    expect(() => resolveSandboxUrl()).toThrow(/PUBLIC_SANDBOX_URL/)
  })

  it('reports no sandbox url when nothing is set', () => {
    expect(resolveSandboxUrl()).toBeUndefined()
  })

  it('falls back to the NEXT_PUBLIC override', () => {
    process.env.NEXT_PUBLIC_E2B_SANDBOX_URL = 'http://sandbox.lvh.me:3002'

    expect(resolveSandboxUrl()).toBe('http://sandbox.lvh.me:3002')
  })

  it('prefers the runtime variable over the NEXT_PUBLIC override', () => {
    process.env.NEXT_PUBLIC_E2B_SANDBOX_URL = 'http://sandbox.lvh.me:3002'
    process.env.E2B_SANDBOX_URL = 'https://sandbox.internal.example'

    expect(resolveSandboxUrl()).toBe('https://sandbox.internal.example')
  })

  it('ignores a whitespace-only runtime variable', () => {
    process.env.E2B_SANDBOX_URL = '   '
    process.env.NEXT_PUBLIC_E2B_SANDBOX_URL = 'http://sandbox.lvh.me:3002'

    expect(resolveSandboxUrl()).toBe('http://sandbox.lvh.me:3002')
  })
})

describe('resolveBrowserRuntimeConfig', () => {
  it('exposes only the domain and sandbox URL, with no server endpoints or credentials', () => {
    process.env.PUBLIC_E2B_DOMAIN = 'runtime.example'
    process.env.PUBLIC_SANDBOX_URL = 'https://sandbox.runtime.example'
    process.env.E2B_INFRA_API_URL = 'http://infra-api.internal:3000'
    process.env.E2B_DASHBOARD_API_URL = 'http://dashboard-api.internal:3010'
    process.env.E2B_API_KEY = 'e2b_test_private_key'

    expect(resolveBrowserRuntimeConfig()).toEqual({
      domain: 'runtime.example',
      sandboxUrl: 'https://sandbox.runtime.example',
    })
  })

  it('keeps SDK routing when API overrides are set without a sandbox URL', () => {
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'

    expect(resolveBrowserRuntimeConfig()).toEqual({
      domain: 'example.dev',
      sandboxUrl: null,
    })
  })

  it('uses the same configured sandbox URL for browser and server consumers', () => {
    process.env.PUBLIC_SANDBOX_URL = 'https://sandbox.example.dev'

    expect(resolveBrowserRuntimeConfig().sandboxUrl).toBe(resolveSandboxUrl())
  })

  it('passes no domain when none is configured', () => {
    delete process.env.NEXT_PUBLIC_E2B_DOMAIN

    expect(resolveBrowserRuntimeConfig().domain).toBeNull()
  })
})

describe('URL validation', () => {
  it('rejects a scheme-less runtime variable, naming it and its value', () => {
    process.env.E2B_INFRA_API_URL = '127.0.0.1:3000'

    expect(() => resolveInfraApiUrl()).toThrow(/E2B_INFRA_API_URL/)
    expect(() => resolveInfraApiUrl()).toThrow(/127\.0\.0\.1:3000/)
  })

  it('rejects a value whose scheme is not http(s)', () => {
    process.env.E2B_DASHBOARD_API_URL = 'localhost:3010'

    expect(() => resolveDashboardApiUrl()).toThrow(/E2B_DASHBOARD_API_URL/)
  })

  it('names the NEXT_PUBLIC variable when that is the malformed one', () => {
    process.env.NEXT_PUBLIC_INFRA_API_URL = 'api.public.example'

    expect(() => resolveInfraApiUrl()).toThrow(/NEXT_PUBLIC_INFRA_API_URL/)
  })

  it('accepts valid http and https URLs', () => {
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'
    process.env.E2B_DASHBOARD_API_URL = 'https://dashboard-api.example.dev'

    expect(resolveInfraApiUrl()).toBe('http://127.0.0.1:3000')
    expect(resolveDashboardApiUrl()).toBe('https://dashboard-api.example.dev')
  })

  it('leaves the domain-derived fallback unvalidated', () => {
    expect(resolveInfraApiUrl()).toBe('https://api.example.dev')
    expect(resolveDashboardApiUrl()).toBe('https://dashboard-api.example.dev')
  })

  it('rejects a malformed sandbox url, naming it and its value', () => {
    process.env.E2B_SANDBOX_URL = 'sandbox.internal.example:3002'

    expect(() => resolveSandboxUrl()).toThrow(/E2B_SANDBOX_URL/)
    expect(() => resolveSandboxUrl()).toThrow(/sandbox\.internal\.example:3002/)
  })
})
