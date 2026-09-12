import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GET } from '@/app/api/config/route'

const saved = new Map<string, string | undefined>()
// tests/setup.ts loads .env files, so a developer's local sandbox URL would
// otherwise leak into these expectations.
const MANAGED_KEYS = [
  'E2B_INFRA_API_URL',
  'E2B_SANDBOX_URL',
  'NEXT_PUBLIC_INFRA_API_URL',
  'NEXT_PUBLIC_E2B_SANDBOX_URL',
] as const

beforeEach(() => {
  for (const key of MANAGED_KEYS) {
    saved.set(key, process.env[key])
    delete process.env[key]
  }
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

describe('/api/config', () => {
  it('serves the browser config resolved from the request', async () => {
    process.env.E2B_INFRA_API_URL = 'http://127.0.0.1:3000'

    const response = await GET(
      new Request('http://dash.example:3001/api/config')
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      infraApiUrl: 'http://127.0.0.1:3000',
      sandboxUrl: 'http://dash.example:3002',
    })
  })

  it('reports no sandbox url when nothing configures one', async () => {
    const response = await GET(
      new Request('http://dash.example:3001/api/config')
    )

    await expect(response.json()).resolves.toMatchObject({ sandboxUrl: null })
  })
})
