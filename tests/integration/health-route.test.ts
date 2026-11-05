import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { logError } = vi.hoisted(() => ({
  logError: vi.fn(),
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: { error: logError },
  serializeErrorForLog: vi.fn((error) => error),
}))

const fetchMock = vi.fn<typeof fetch>()

// the infra client resolves its base URL at import, so load the route after stubbing env
async function loadRoute() {
  vi.resetModules()
  return import('@/app/api/health/route')
}

function requestedUrl(): string {
  const [input] = fetchMock.mock.calls[0] ?? []
  if (input instanceof Request) return input.url
  return String(input)
}

beforeEach(() => {
  vi.stubEnv('PUBLIC_E2B_DOMAIN', 'example.dev')
  vi.stubEnv('E2B_INFRA_API_URL', '')
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  fetchMock.mockReset()
  logError.mockReset()
})

describe('/api/health', () => {
  it('returns ok when infra-api is healthy', async () => {
    fetchMock.mockResolvedValue(
      new Response('Health check successful', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })
    )
    const { GET } = await loadRoute()

    const response = await GET()

    expect(requestedUrl()).toBe('https://api.example.dev/health')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      status: 'ok',
      checks: { infraApi: true },
    })
    expect(logError).not.toHaveBeenCalled()
  })

  it('returns degraded and logs the status when infra-api is not ok', async () => {
    fetchMock.mockResolvedValue(
      new Response('downstream unavailable', {
        status: 503,
        headers: { 'content-type': 'text/plain' },
      })
    )
    const { GET } = await loadRoute()

    const response = await GET()

    expect(requestedUrl()).toBe('https://api.example.dev/health')
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      status: 'degraded',
      checks: { infraApi: false },
    })
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'health_check:infra_api_error',
        status: 503,
        error: 'downstream unavailable',
      }),
      'Infra API health check failed'
    )
  })

  it('returns degraded when the request to infra-api fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    const { GET } = await loadRoute()

    const response = await GET()

    expect(requestedUrl()).toBe('https://api.example.dev/health')
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      status: 'degraded',
      checks: { infraApi: false },
    })
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'health_check:infra_api_error' }),
      'Infra API health check failed'
    )
  })
})
