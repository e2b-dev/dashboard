import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it } from 'vitest'
import { COOKIE_KEYS } from '@/configs/cookies'
import { runDashboardProxy } from '@/core/server/proxy/runtime'

const BASE = 'https://dashboard.local'

function makeRequest(path: string, apiKey?: string): NextRequest {
  const request = new NextRequest(new URL(path, BASE))
  if (apiKey) {
    request.cookies.set(COOKIE_KEYS.API_KEY, apiKey)
  }
  return request
}

afterEach(() => {
  delete process.env.E2B_API_KEY
})

describe('runDashboardProxy', () => {
  it('redirects bare / into the dashboard when an api key cookie is present', async () => {
    const response = await runDashboardProxy(makeRequest('/', 'e2b_key'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`${BASE}/sandboxes`)
  })

  it('lets /?tab= through so the root page resolves the deep link', async () => {
    const response = await runDashboardProxy(
      makeRequest('/?tab=templates', 'e2b_key')
    )

    expect(response.headers.get('location')).toBeNull()
  })

  it('leaves / alone without an api key (key form renders)', async () => {
    const response = await runDashboardProxy(makeRequest('/'))

    expect(response.headers.get('location')).toBeNull()
  })

  it.each([
    '/sandboxes',
    '/sandboxes/sbx_123/logs',
    '/templates/list',
  ])('redirects %s to the key form with returnTo when no api key is present', async (path) => {
    const response = await runDashboardProxy(makeRequest(path))

    expect(response.status).toBe(307)
    const location = new URL(response.headers.get('location') as string)
    expect(location.pathname).toBe('/')
    expect(location.searchParams.get('returnTo')).toBe(path)
  })

  it.each([
    '/sandboxes',
    '/templates/list',
  ])('passes %s through when the api key cookie is present', async (path) => {
    const response = await runDashboardProxy(makeRequest(path, 'e2b_key'))

    expect(response.headers.get('location')).toBeNull()
  })

  it('treats E2B_API_KEY env as authenticated', async () => {
    process.env.E2B_API_KEY = 'e2b_env_key'

    const protectedResponse = await runDashboardProxy(makeRequest('/sandboxes'))
    expect(protectedResponse.headers.get('location')).toBeNull()

    const rootResponse = await runDashboardProxy(makeRequest('/'))
    expect(rootResponse.headers.get('location')).toBe(`${BASE}/sandboxes`)
  })

  it('preserves the query string in returnTo', async () => {
    const response = await runDashboardProxy(
      makeRequest('/sandboxes/sbx_123/logs?level=error')
    )

    const location = new URL(response.headers.get('location') as string)
    expect(location.searchParams.get('returnTo')).toBe(
      '/sandboxes/sbx_123/logs?level=error'
    )
  })

  it('ignores unrelated public paths', async () => {
    const response = await runDashboardProxy(makeRequest('/some-public-page'))

    expect(response.headers.get('location')).toBeNull()
  })
})
