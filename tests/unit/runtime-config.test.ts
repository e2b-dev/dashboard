import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  resolveBrowserRuntimeConfig,
  resolveDashboardApiUrl,
  resolveE2BDomain,
  resolveInfraApiUrl,
  resolveSandboxUrl,
  resolveServerSandboxUrl,
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
      expect(resolveBrowserRuntimeConfig(new Headers())).toEqual({
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

    expect(resolveBrowserRuntimeConfig(new Headers())).toEqual({
      domain: 'runtime.example',
      sandboxUrl: 'https://sandbox.runtime.example',
    })
  })

  it('resolves the sandbox host from layout headers without a request URL', () => {
    process.env.E2B_INFRA_API_URL = 'http://infra-api.internal:3000'
    const requestHeaders = new Headers({
      host: 'dashboard.internal:3001',
      'x-forwarded-host': '192.0.2.1:8443',
      'x-forwarded-proto': 'https',
    })

    expect(resolveBrowserRuntimeConfig(requestHeaders).sandboxUrl).toBe(
      'https://192.0.2.1:3002'
    )
  })

  const requestUrl = 'http://dash.example:3001/sandboxes'
  const headers = (init: Record<string, string> = {}) =>
    new Headers({ host: 'dash.example:3001', ...init })

  it('reports no sandbox url for a deployment that sets no runtime variables', () => {
    expect(resolveBrowserRuntimeConfig(headers(), requestUrl)).toEqual({
      domain: 'example.dev',
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
      domain: 'example.dev',
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

  it('passes no domain when none is configured', () => {
    delete process.env.NEXT_PUBLIC_E2B_DOMAIN

    expect(resolveBrowserRuntimeConfig(headers(), requestUrl).domain).toBeNull()
  })

  it('reads the host from the request url when no host header is present', () => {
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'

    expect(
      resolveBrowserRuntimeConfig(new Headers(), requestUrl).sandboxUrl
    ).toBe('http://dash.example:3002')
  })
})

/**
 * The server-side SDK calls resolve the sandbox URL exactly as the browser
 * does. A runtime-configured install leaves E2B_SANDBOX_URL unset so every
 * browser is told the host it reached the dashboard on; a server that read
 * only the environment would fall back to the build-time domain, and its envd
 * calls would go nowhere.
 */
describe('resolveServerSandboxUrl', () => {
  const requestUrl = 'http://dash.example:3001/api/trpc/sandbox.killTerminalPty'
  const headers = (init: Record<string, string> = {}) =>
    new Headers({ host: 'dash.example:3001', ...init })

  it('reports no sandbox url for a deployment that sets no runtime variables', () => {
    expect(resolveServerSandboxUrl(headers(), requestUrl)).toBeUndefined()
  })

  it('uses the explicit runtime value', () => {
    process.env.E2B_SANDBOX_URL = 'https://sandbox.internal.example'

    expect(resolveServerSandboxUrl(headers(), requestUrl)).toBe(
      'https://sandbox.internal.example'
    )
  })

  it('falls back to the NEXT_PUBLIC sandbox url', () => {
    process.env.NEXT_PUBLIC_E2B_SANDBOX_URL = 'http://sandbox.lvh.me:3002'

    expect(resolveServerSandboxUrl(headers(), requestUrl)).toBe(
      'http://sandbox.lvh.me:3002'
    )
  })

  it('defaults to the request host on 3002 for a runtime-configured install', () => {
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'

    expect(resolveServerSandboxUrl(headers(), requestUrl)).toBe(
      'http://dash.example:3002'
    )
  })

  it('prefers the explicit value over the request-host default', () => {
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'
    process.env.E2B_SANDBOX_URL = 'https://sandbox.internal.example'

    expect(resolveServerSandboxUrl(headers(), requestUrl)).toBe(
      'https://sandbox.internal.example'
    )
  })

  it('honours x-forwarded-host and x-forwarded-proto', () => {
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'

    expect(
      resolveServerSandboxUrl(
        headers({
          'x-forwarded-host': 'public.example:8443',
          'x-forwarded-proto': 'https,http',
        }),
        requestUrl
      )
    ).toBe('https://public.example:3002')
  })

  // A procedure called from a server component has the request headers but no
  // request URL, so the host header has to carry the default on its own.
  it('resolves the host from the headers when there is no request url', () => {
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'

    expect(resolveServerSandboxUrl(headers(), undefined)).toBe(
      'http://dash.example:3002'
    )
  })

  it('honours x-forwarded-proto when there is no request url', () => {
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'

    expect(
      resolveServerSandboxUrl(
        headers({ 'x-forwarded-proto': 'https' }),
        undefined
      )
    ).toBe('https://dash.example:3002')
  })

  it('reports no sandbox url when the request carries no host at all', () => {
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'

    expect(resolveServerSandboxUrl(new Headers(), undefined)).toBeUndefined()
  })

  // The whole point of the helper: the two resolutions cannot drift.
  it('resolves to what the browser is told', () => {
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'

    expect(resolveServerSandboxUrl(headers(), requestUrl)).toBe(
      resolveBrowserRuntimeConfig(headers(), requestUrl).sandboxUrl
    )
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
        'http://dash.example:3001/sandboxes'
      ).sandboxUrl
    ).toBe('http://dash.example:3002')
  })
})
