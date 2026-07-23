import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const cookieStoreMock = vi.hoisted(() => {
  const jar = new Map<string, string>()
  return {
    jar,
    get: vi.fn((name: string) =>
      jar.has(name) ? { name, value: jar.get(name) as string } : undefined
    ),
    set: vi.fn((name: string, value: string) => {
      jar.set(name, value)
    }),
    delete: vi.fn((name: string) => {
      jar.delete(name)
    }),
  }
})

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStoreMock),
}))

vi.mock('server-only', () => ({}))

const infraMock = vi.hoisted(() => ({ GET: vi.fn() }))
vi.mock('@/core/shared/clients/api', () => ({
  infra: infraMock,
  api: { GET: vi.fn() },
}))

const { getApiKey, isUsingEnvApiKey, setApiKeyCookie, validateApiKey } =
  await import('@/core/server/auth/api-key')

describe('getApiKey', () => {
  beforeEach(() => {
    cookieStoreMock.jar.clear()
  })

  afterEach(() => {
    delete process.env.E2B_API_KEY
  })

  it('returns null without a cookie or env key', async () => {
    expect(await getApiKey()).toBeNull()
    expect(isUsingEnvApiKey()).toBe(false)
  })

  it('reads the cookie', async () => {
    await setApiKeyCookie('e2b_cookie_key')

    expect(await getApiKey()).toBe('e2b_cookie_key')
  })

  it('prefers the E2B_API_KEY env var over the cookie', async () => {
    process.env.E2B_API_KEY = 'e2b_env_key'
    await setApiKeyCookie('e2b_cookie_key')

    expect(await getApiKey()).toBe('e2b_env_key')
    expect(isUsingEnvApiKey()).toBe(true)
  })
})

describe('validateApiKey', () => {
  beforeEach(() => {
    infraMock.GET.mockReset()
  })

  it('accepts a key when the infra api responds ok', async () => {
    infraMock.GET.mockResolvedValue({ response: { ok: true, status: 200 } })

    expect(await validateApiKey('e2b_valid')).toEqual({ valid: true })
    expect(infraMock.GET).toHaveBeenCalledWith(
      '/v2/sandboxes',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-API-Key': 'e2b_valid' }),
      })
    )
  })

  it.each([401, 403])('maps %s to unauthorized', async (status) => {
    infraMock.GET.mockResolvedValue({ response: { ok: false, status } })

    expect(await validateApiKey('e2b_bad')).toEqual({
      valid: false,
      reason: 'unauthorized',
    })
  })

  it('maps unexpected statuses to unavailable', async () => {
    infraMock.GET.mockResolvedValue({ response: { ok: false, status: 500 } })

    expect(await validateApiKey('e2b_key')).toEqual({
      valid: false,
      reason: 'unavailable',
    })
  })

  it('maps network failures to unavailable', async () => {
    infraMock.GET.mockRejectedValue(new Error('connect ECONNREFUSED'))

    expect(await validateApiKey('e2b_key')).toEqual({
      valid: false,
      reason: 'unavailable',
    })
  })
})
