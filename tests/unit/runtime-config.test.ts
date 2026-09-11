import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  resolveDashboardApiUrl,
  resolveInfraApiUrl,
} from '@/core/server/runtime-config'

const MANAGED_KEYS = [
  'E2B_INFRA_API_URL',
  'E2B_DASHBOARD_API_URL',
  'NEXT_PUBLIC_INFRA_API_URL',
  'NEXT_PUBLIC_DASHBOARD_API_URL',
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
})
