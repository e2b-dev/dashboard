import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadOpenFeatureClient({
  getClient = vi.fn(() => ({ client: true })),
  setProviderAndWait,
}: {
  getClient?: ReturnType<typeof vi.fn>
  setProviderAndWait: ReturnType<typeof vi.fn>
}) {
  vi.resetModules()
  vi.doMock('@launchdarkly/openfeature-node-server', () => ({
    LaunchDarklyProvider: vi.fn(),
  }))
  vi.doMock('@openfeature/server-sdk', () => ({
    OpenFeature: {
      getClient,
      setProviderAndWait,
    },
  }))
  vi.doMock('@/core/shared/clients/logger/logger', () => ({
    l: { warn: vi.fn() },
    serializeErrorForLog: vi.fn((error) => error),
  }))

  return import('@/core/modules/feature-flags/openfeature-client.server')
}

afterEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('getOpenFeatureServerClient', () => {
  it('caches failed LaunchDarkly initialization until the retry interval elapses', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    vi.stubEnv('LAUNCHDARKLY_SDK_KEY', 'sdk-key')
    const setProviderAndWait = vi.fn().mockRejectedValue(new Error('timeout'))
    const { getOpenFeatureServerClient } = await loadOpenFeatureClient({
      setProviderAndWait,
    })

    await expect(getOpenFeatureServerClient()).resolves.toBeNull()
    await expect(getOpenFeatureServerClient()).resolves.toBeNull()

    expect(setProviderAndWait).toHaveBeenCalledTimes(1)

    vi.setSystemTime(60_000)
    await expect(getOpenFeatureServerClient()).resolves.toBeNull()

    expect(setProviderAndWait).toHaveBeenCalledTimes(2)
  })

  it('recovers when LaunchDarkly initialization succeeds after the retry interval', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    vi.stubEnv('LAUNCHDARKLY_SDK_KEY', 'sdk-key')
    const client = { client: true }
    const getClient = vi.fn(() => client)
    const setProviderAndWait = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(undefined)
    const { getOpenFeatureServerClient } = await loadOpenFeatureClient({
      getClient,
      setProviderAndWait,
    })

    await expect(getOpenFeatureServerClient()).resolves.toBeNull()

    vi.setSystemTime(60_000)

    await expect(getOpenFeatureServerClient()).resolves.toBe(client)
    expect(setProviderAndWait).toHaveBeenCalledTimes(2)
    expect(getClient).toHaveBeenCalledTimes(1)
  })
})
