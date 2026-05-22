import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGet, pingKv } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  pingKv: vi.fn(),
}))

vi.mock('@/core/shared/clients/api', () => ({
  api: {
    GET: apiGet,
  },
}))

vi.mock('@/core/shared/clients/kv', () => ({
  pingKv,
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: {
    error: vi.fn(),
  },
  serializeErrorForLog: vi.fn((error) => error),
}))

import { GET } from '@/app/api/health/route'

describe('/api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('omits checks.kv when KV is not configured', async () => {
    pingKv.mockResolvedValue({
      configured: false,
      available: false,
      status: 'not_configured',
    })
    apiGet.mockResolvedValue({ error: null })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      status: 'ok',
      checks: { dashboardApi: true },
    })
    expect(body.checks).not.toHaveProperty('kv')
  })

  it('returns degraded when KV is configured but ping fails', async () => {
    pingKv.mockResolvedValue({
      configured: true,
      available: false,
      status: 'error',
      error: new Error('kv unavailable'),
    })
    apiGet.mockResolvedValue({ error: null })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({
      status: 'degraded',
      checks: { kv: false, dashboardApi: true },
    })
  })

  it('returns degraded when KV env is misconfigured', async () => {
    pingKv.mockResolvedValue({
      configured: false,
      available: false,
      status: 'misconfigured',
    })
    apiGet.mockResolvedValue({ error: null })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({
      status: 'degraded',
      checks: { kv: false, dashboardApi: true },
    })
  })

  it('includes checks.kv === true when KV is configured and healthy', async () => {
    pingKv.mockResolvedValue({
      configured: true,
      available: true,
      status: 'ok',
    })
    apiGet.mockResolvedValue({ error: null })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      status: 'ok',
      checks: { kv: true, dashboardApi: true },
    })
  })

  it('returns degraded when required dashboard-api is unhealthy', async () => {
    pingKv.mockResolvedValue({
      configured: true,
      available: true,
      status: 'ok',
    })
    apiGet.mockResolvedValue({ error: { message: 'downstream unavailable' } })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.status).toBe('degraded')
    expect(body.checks).toEqual({ kv: true, dashboardApi: false })
  })
})
