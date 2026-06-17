import { describe, expect, it, vi } from 'vitest'
import type { FeatureFlagContext } from '@/core/modules/feature-flags/context'
import { createFeatureFlagService } from '@/core/modules/feature-flags/feature-flags.server'
import { createPostHogFlagEvaluationOptions } from '@/core/modules/feature-flags/posthog-provider.server'

const context = {
  user: {
    id: 'user-id',
    email: 'user@example.com',
  },
  team: {
    id: 'team-id',
    slug: 'team-slug',
    name: 'Team Name',
  },
  environment: 'preview',
} satisfies FeatureFlagContext

describe('createFeatureFlagService', () => {
  it('evaluates boolean flags through the provider', async () => {
    const provider = {
      evaluate: vi.fn().mockResolvedValue({
        getFlagValue: vi.fn().mockReturnValue(true),
        getPayload: vi.fn(),
      }),
    }

    const result = await createFeatureFlagService(provider).isEnabled(
      'isAdmin',
      context
    )

    expect(result).toBe(true)
    expect(provider.evaluate).toHaveBeenCalledWith(context, ['is_admin'])
  })

  it('falls back to the flag default when PostHog has no value', async () => {
    const provider = {
      evaluate: vi.fn().mockResolvedValue({
        getFlagValue: vi.fn().mockReturnValue(undefined),
        getPayload: vi.fn(),
      }),
    }

    const result = await createFeatureFlagService(provider).isEnabled(
      'isAdmin',
      context
    )

    expect(result).toBe(false)
  })

  it('evaluates the registry in a single provider call', async () => {
    const provider = {
      evaluate: vi.fn().mockResolvedValue({
        getFlagValue: vi.fn().mockReturnValue(true),
        getPayload: vi.fn(),
      }),
    }

    const result = await createFeatureFlagService(provider).evaluateAll(context)

    expect(provider.evaluate).toHaveBeenCalledTimes(1)
    expect(provider.evaluate).toHaveBeenCalledWith(context, ['is_admin'])
    expect(result).toEqual([
      {
        id: 'isAdmin',
        key: 'is_admin',
        kind: 'boolean',
        description: 'Enables dashboard admin-only surfaces.',
        defaultValue: false,
        value: true,
      },
    ])
  })
})

describe('createPostHogFlagEvaluationOptions', () => {
  it('maps dashboard users and teams to PostHog identity inputs', () => {
    expect(createPostHogFlagEvaluationOptions(context, ['is_admin'])).toEqual({
      flagKeys: ['is_admin'],
      disableGeoip: true,
      personProperties: {
        email: 'user@example.com',
        environment: 'preview',
      },
      groups: {
        team: 'team-id',
      },
      groupProperties: {
        team: {
          name: 'Team Name',
          slug: 'team-slug',
          environment: 'preview',
        },
      },
    })
  })
})
