import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createClient, redisClient } = vi.hoisted(() => {
  const client = {
    isReady: false,
    on: vi.fn(),
    connect: vi.fn(),
    ping: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  }

  client.connect.mockImplementation(async () => {
    client.isReady = true
    return client
  })

  return {
    createClient: vi.fn(() => client),
    redisClient: client,
  }
})

vi.mock('redis', () => ({
  createClient,
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: {
    error: vi.fn(),
  },
  serializeErrorForLog: vi.fn((error) => error),
}))

const originalRedisUrl = process.env.REDIS_URL

async function loadKvClient() {
  vi.resetModules()
  return import('@/core/shared/clients/kv')
}

function resetRedisEnv() {
  if (originalRedisUrl === undefined) {
    delete process.env.REDIS_URL
  } else {
    process.env.REDIS_URL = originalRedisUrl
  }
}

describe('optional KV client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    redisClient.isReady = false
    redisClient.connect.mockImplementation(async () => {
      redisClient.isReady = true
      return redisClient
    })
    delete process.env.REDIS_URL
  })

  afterEach(() => {
    resetRedisEnv()
  })

  it('reports KV as not configured when REDIS_URL is omitted', async () => {
    const { pingKv } = await loadKvClient()

    await expect(pingKv()).resolves.toEqual({
      configured: false,
      available: false,
      status: 'not_configured',
    })
    expect(createClient).not.toHaveBeenCalled()
  })

  it('reports KV as misconfigured when REDIS_URL is not a Redis URL', async () => {
    process.env.REDIS_URL = 'https://example.com'
    const { pingKv } = await loadKvClient()

    await expect(pingKv()).resolves.toEqual({
      configured: false,
      available: false,
      status: 'misconfigured',
    })
    expect(createClient).not.toHaveBeenCalled()
  })

  it('reports KV as healthy when Redis ping succeeds', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    redisClient.ping.mockResolvedValue('PONG')
    const { pingKv } = await loadKvClient()

    await expect(pingKv()).resolves.toEqual({
      configured: true,
      available: true,
      status: 'ok',
    })
    expect(createClient).toHaveBeenCalledWith({
      url: 'redis://localhost:6379',
    })
    expect(redisClient.on).toHaveBeenCalledWith('error', expect.any(Function))
    expect(redisClient.connect).toHaveBeenCalledTimes(1)
    expect(redisClient.ping).toHaveBeenCalledTimes(1)
  })

  it('reports KV errors when Redis connection fails', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    const error = new Error('redis unavailable')
    redisClient.connect.mockRejectedValue(error)
    const { pingKv } = await loadKvClient()

    await expect(pingKv()).resolves.toEqual({
      configured: true,
      available: false,
      status: 'error',
      error,
    })
  })

  it('connects once across repeated operations', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    redisClient.ping.mockResolvedValue('PONG')
    redisClient.get.mockResolvedValue('true')
    const { getKvValue, pingKv } = await loadKvClient()

    await pingKv()
    await getKvValue<boolean>('warned-alternate-email:user@example.com')

    expect(redisClient.connect).toHaveBeenCalledTimes(1)
  })

  it('serializes values as JSON when setting KV values', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    redisClient.set.mockResolvedValue('OK')
    const { setKvValue } = await loadKvClient()

    await expect(setKvValue('flag', true)).resolves.toEqual({
      ok: true,
      configured: true,
      value: 'OK',
    })
    expect(redisClient.set).toHaveBeenCalledWith('flag', 'true')
  })

  it('parses JSON values when getting KV values', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    redisClient.get.mockResolvedValue('{"enabled":true}')
    const { getKvValue } = await loadKvClient()

    await expect(getKvValue<{ enabled: boolean }>('settings')).resolves.toEqual(
      {
        ok: true,
        configured: true,
        value: { enabled: true },
      }
    )
  })

  it('returns null when getting a missing KV value', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    redisClient.get.mockResolvedValue(null)
    const { getKvValue } = await loadKvClient()

    await expect(getKvValue<boolean>('missing')).resolves.toEqual({
      ok: true,
      configured: true,
      value: null,
    })
  })

  it('reports KV errors when stored JSON cannot be parsed', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    redisClient.get.mockResolvedValue('not-json')
    const { getKvValue } = await loadKvClient()

    await expect(getKvValue<boolean>('invalid')).resolves.toMatchObject({
      ok: false,
      configured: true,
      reason: 'error',
    })
  })
})
