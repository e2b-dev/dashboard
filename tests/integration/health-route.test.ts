import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGet } = vi.hoisted(() => ({
  apiGet: vi.fn(),
}))

vi.mock('@/core/shared/clients/api', () => ({
  api: {
    GET: apiGet,
  },
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

  it('returns ok when dashboard-api is healthy', async () => {
    apiGet.mockResolvedValue({ error: null })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      status: 'ok',
      checks: { dashboardApi: true },
    })
  })

  it('returns degraded when required dashboard-api is unhealthy', async () => {
    apiGet.mockResolvedValue({ error: { message: 'downstream unavailable' } })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.status).toBe('degraded')
    expect(body.checks).toEqual({ dashboardApi: false })
  })
})
