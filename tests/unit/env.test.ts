import { describe, expect, it } from 'vitest'
import { appEnvSchema } from '@/lib/env'

const domain = { PUBLIC_E2B_DOMAIN: 'cluster.example' }
const deprecatedVariables = [
  ['NEXT_PUBLIC_E2B_DOMAIN', 'PUBLIC_E2B_DOMAIN'],
  ['NEXT_PUBLIC_INFRA_API_URL', 'E2B_INFRA_API_URL'],
  ['NEXT_PUBLIC_E2B_SANDBOX_URL', 'PUBLIC_SANDBOX_URL'],
  ['E2B_SANDBOX_URL', 'PUBLIC_SANDBOX_URL'],
] as const

describe('dashboard environment validation', () => {
  it('requires the runtime domain even when a legacy domain is set', () => {
    for (const value of [undefined, '', '   ']) {
      const parsed = appEnvSchema.safeParse({
        PUBLIC_E2B_DOMAIN: value,
        NEXT_PUBLIC_E2B_DOMAIN: 'legacy.example',
      })
      expect(parsed.success).toBe(false)
      if (!parsed.success) {
        expect(parsed.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: ['PUBLIC_E2B_DOMAIN'] }),
          ])
        )
      }
    }
  })

  it('allows domain routing without API or sandbox overrides', () => {
    expect(appEnvSchema.parse(domain)).toEqual(domain)
  })

  it('normalizes runtime settings consistently', () => {
    expect(
      appEnvSchema.parse({
        PUBLIC_E2B_DOMAIN: ' cluster.example ',
        PUBLIC_SANDBOX_URL: ' https://sandbox.cluster.example ',
        E2B_INFRA_API_URL: ' http://127.0.0.1:3000 ',
        DASHBOARD_COOKIE_SECURE: ' FALSE ',
        OTEL_EXPORTER_OTLP_ENDPOINT: '',
      })
    ).toMatchObject({
      ...domain,
      PUBLIC_SANDBOX_URL: 'https://sandbox.cluster.example',
      E2B_INFRA_API_URL: 'http://127.0.0.1:3000',
      DASHBOARD_COOKIE_SECURE: 'false',
      OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
    })
  })

  // Upgrades must not fail on settings for services the dashboard no longer uses.
  it('ignores variables it does not read', () => {
    expect(
      appEnvSchema.parse({ ...domain, E2B_RETIRED_API_URL: 'not a url' })
    ).toEqual(domain)
  })

  it.each(
    deprecatedVariables
  )('reports how to migrate %s', (key, replacement) => {
    const parsed = appEnvSchema.safeParse({
      ...domain,
      [key]: 'https://old.example',
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: [key],
            message: expect.stringContaining(replacement),
          }),
        ])
      )
    }
  })

  it.each([
    'PUBLIC_SANDBOX_URL',
    'E2B_INFRA_API_URL',
  ])('requires an HTTP(S) URL for %s', (key) => {
    for (const value of ['localhost:3002', 'ftp://sandbox.example']) {
      const parsed = appEnvSchema.safeParse({ ...domain, [key]: value })
      expect(parsed.success).toBe(false)
      if (!parsed.success) expect(parsed.error.issues[0].path).toEqual([key])
    }
  })

  it('rejects an invalid cookie flag', () => {
    expect(
      appEnvSchema.safeParse({ ...domain, DASHBOARD_COOKIE_SECURE: 'off' })
        .success
    ).toBe(false)
  })
})
