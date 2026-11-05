import { beforeEach, describe, expect, it, vi } from 'vitest'

const { infraGet } = vi.hoisted(() => ({
  infraGet: vi.fn(),
}))

vi.mock('@/core/shared/clients/api', () => ({
  infra: {
    GET: infraGet,
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

  it('returns ok when infra-api is healthy', async () => {
    infraGet.mockResolvedValue({ error: null })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      status: 'ok',
      checks: { infraApi: true },
    })
  })

  it('returns degraded when infra-api is unhealthy', async () => {
    infraGet.mockResolvedValue({ error: { message: 'downstream unavailable' } })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.status).toBe('degraded')
    expect(body.checks).toEqual({ infraApi: false })
  })
})
