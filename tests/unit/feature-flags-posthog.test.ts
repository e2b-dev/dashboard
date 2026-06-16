import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BooleanFeatureFlagDefinition } from '@/configs/flags'

const isFeatureEnabled = vi.fn()

vi.mock('posthog-node', () => ({
  PostHog: vi.fn().mockImplementation(() => ({ isFeatureEnabled })),
}))

const flag = {
  kind: 'boolean',
  key: 'ory-custom-ui',
  defaultValue: false,
} satisfies BooleanFeatureFlagDefinition

async function loadProvider() {
  vi.resetModules()
  const mod = await import('@/core/server/feature-flags/posthog')
  return mod.postHogFeatureFlagProvider
}

const originalEnv = { ...process.env }

beforeEach(() => {
  isFeatureEnabled.mockReset()
  process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test'
  process.env.VERCEL_ENV = 'preview'
})

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('postHogFeatureFlagProvider.getBoolean', () => {
  it('evaluates with the deploy environment and an anonymous distinct id', async () => {
    isFeatureEnabled.mockResolvedValue(true)
    const provider = await loadProvider()

    const result = await provider.getBoolean(flag, {})

    expect(result).toBe(true)
    expect(isFeatureEnabled).toHaveBeenCalledWith(
      'ory-custom-ui',
      'anonymous-server',
      expect.objectContaining({
        sendFeatureFlagEvents: false,
        personProperties: { environment: 'preview' },
      })
    )
  })

  it('uses the authenticated user id as distinct id when present', async () => {
    isFeatureEnabled.mockResolvedValue(false)
    const provider = await loadProvider()

    await provider.getBoolean(flag, { userId: 'user-123' })

    expect(isFeatureEnabled).toHaveBeenCalledWith(
      'ory-custom-ui',
      'user-123',
      expect.anything()
    )
  })

  it('falls back to the flag default when PostHog returns undefined', async () => {
    isFeatureEnabled.mockResolvedValue(undefined)
    const provider = await loadProvider()

    expect(await provider.getBoolean(flag, {})).toBe(false)
  })

  it('falls back to the flag default when evaluation throws', async () => {
    isFeatureEnabled.mockRejectedValue(new Error('network down'))
    const provider = await loadProvider()

    expect(await provider.getBoolean(flag, {})).toBe(false)
  })

  it('returns the default without calling PostHog when the key is missing', async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = ''
    const provider = await loadProvider()

    expect(await provider.getBoolean(flag, {})).toBe(false)
    expect(isFeatureEnabled).not.toHaveBeenCalled()
  })
})
