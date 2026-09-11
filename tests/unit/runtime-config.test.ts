import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  resolveBrowserRuntimeConfig,
  resolveDashboardApiUrl,
  resolveInfraApiUrl,
  resolveSandboxUrl,
} from '@/core/server/runtime-config'

const MANAGED_KEYS = [
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
  const requestUrl = 'http://dash.example:3001/api/config'
  const headers = (init: Record<string, string> = {}) =>
    new Headers({ host: 'dash.example:3001', ...init })

  it('reports no sandbox url for a deployment that sets no runtime variables', () => {
    expect(resolveBrowserRuntimeConfig(headers(), requestUrl)).toEqual({
      infraApiUrl: 'https://api.example.dev',
      sandboxUrl: null,
    })
  })

  it('falls back to the NEXT_PUBLIC sandbox url', () => {
    process.env.NEXT_PUBLIC_E2B_SANDBOX_URL = 'http://sandbox.lvh.me:3002'

    expect(resolveBrowserRuntimeConfig(headers(), requestUrl).sandboxUrl).toBe(
      'http://sandbox.lvh.me:3002'
    )
  })

  it('prefers the runtime sandbox url over the NEXT_PUBLIC one', () => {
    process.env.NEXT_PUBLIC_E2B_SANDBOX_URL = 'http://sandbox.lvh.me:3002'
    process.env.E2B_SANDBOX_URL = 'https://sandbox.internal.example'

    expect(resolveBrowserRuntimeConfig(headers(), requestUrl).sandboxUrl).toBe(
      'https://sandbox.internal.example'
    )
  })

  it('defaults to the request host on 3002 for a runtime-configured install', () => {
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'

    expect(resolveBrowserRuntimeConfig(headers(), requestUrl)).toEqual({
      infraApiUrl: 'http://127.0.0.1:3000',
      sandboxUrl: 'http://dash.example:3002',
    })
  })

  it('honours x-forwarded-host and x-forwarded-proto', () => {
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'

    const config = resolveBrowserRuntimeConfig(
      headers({
        'x-forwarded-host': 'public.example:8443',
        'x-forwarded-proto': 'https,http',
      }),
      requestUrl
    )

    expect(config.sandboxUrl).toBe('https://public.example:3002')
  })

  // A proxy header is attacker-controllable in a misconfigured deployment, and
  // whatever lands here is served to the browser and handed to the SDK.
  it('ignores a malformed x-forwarded-host and uses the host header', () => {
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'

    const config = resolveBrowserRuntimeConfig(
      headers({ host: 'other.example:3001', 'x-forwarded-host': 'foo bar' }),
      requestUrl
    )

    expect(config.sandboxUrl).toBe('http://other.example:3002')
  })

  it('falls back to the request url when every host candidate is malformed', () => {
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'

    const config = resolveBrowserRuntimeConfig(
      headers({ host: 'also bad', 'x-forwarded-host': 'foo bar' }),
      requestUrl
    )

    expect(config.sandboxUrl).toBe('http://dash.example:3002')
  })

  it('ignores an x-forwarded-host whose port is out of range', () => {
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'

    const config = resolveBrowserRuntimeConfig(
      headers({ 'x-forwarded-host': 'h:99999' }),
      requestUrl
    )

    expect(config.sandboxUrl).toBe('http://dash.example:3002')
  })

  it('ignores an x-forwarded-proto that is not http(s)', () => {
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'

    const config = resolveBrowserRuntimeConfig(
      headers({ 'x-forwarded-proto': 'javascript' }),
      requestUrl
    )

    expect(config.sandboxUrl).toBe('http://dash.example:3002')
  })

  it('accepts an uppercase x-forwarded-proto', () => {
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'

    const config = resolveBrowserRuntimeConfig(
      headers({ 'x-forwarded-proto': 'HTTPS' }),
      requestUrl
    )

    expect(config.sandboxUrl).toBe('https://dash.example:3002')
  })

  it('falls back to the request host for the infra url with no domain set', () => {
    delete process.env.NEXT_PUBLIC_E2B_DOMAIN

    expect(resolveBrowserRuntimeConfig(headers(), requestUrl).infraApiUrl).toBe(
      'http://dash.example:3000'
    )
  })

  it('reads the host from the request url when no host header is present', () => {
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'

    expect(
      resolveBrowserRuntimeConfig(new Headers(), requestUrl).sandboxUrl
    ).toBe('http://dash.example:3002')
  })
})

// The schema in src/lib/env.ts runs in dev, prebuild and tests but never in a
// running container, so a malformed URL has to fail here instead.
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

  // The request-host default is built from a parsed URL, not read from the
  // environment, so it never reaches the validator.
  it('leaves the request-host default unvalidated', () => {
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'

    expect(
      resolveBrowserRuntimeConfig(
        new Headers({ host: 'dash.example:3001' }),
        'http://dash.example:3001/api/config'
      ).sandboxUrl
    ).toBe('http://dash.example:3002')
  })
})
