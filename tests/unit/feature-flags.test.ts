import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type FeatureFlagContext,
  getFeatureFlagEnvironment,
} from '@/core/modules/feature-flags/context'
import { FEATURE_FLAGS } from '@/core/modules/feature-flags/definitions'
import { createFeatureFlagService } from '@/core/modules/feature-flags/feature-flags.server'
import { createOpenFeatureEvaluationContext } from '@/core/modules/feature-flags/launchdarkly-openfeature-provider.server'

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
  environment: 'staging',
} satisfies FeatureFlagContext

afterEach(() => {
  vi.unstubAllEnvs()
})

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
    expect(provider.evaluate).toHaveBeenCalledWith(context, [
      FEATURE_FLAGS.isAdmin,
    ])
  })

  it('falls back to the flag default when the provider has no value', async () => {
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
    expect(provider.evaluate).toHaveBeenCalledWith(context, [
      FEATURE_FLAGS.agentsEnabled,
      FEATURE_FLAGS.isAdmin,
    ])
    expect(result).toEqual([
      {
        id: 'agentsEnabled',
        key: 'agents_enabled',
        kind: 'boolean',
        description: 'Enables the dashboard agents launcher.',
        defaultValue: false,
        value: true,
      },
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

describe('createOpenFeatureEvaluationContext', () => {
  it('maps dashboard users and teams to a LaunchDarkly multi-context', () => {
    expect(createOpenFeatureEvaluationContext(context)).toEqual({
      kind: 'multi',
      user: {
        targetingKey: 'user-id',
        email: 'user@example.com',
        environment: 'staging',
      },
      team: {
        targetingKey: 'team-id',
        name: 'Team Name',
        slug: 'team-slug',
        environment: 'staging',
      },
    })
  })

  it('maps dashboard users without teams to a user context', () => {
    expect(
      createOpenFeatureEvaluationContext({
        user: {
          id: 'user-id',
          email: 'user@example.com',
        },
      })
    ).toEqual({
      kind: 'user',
      targetingKey: 'user-id',
      email: 'user@example.com',
      environment: 'staging',
    })
  })
})

describe('getFeatureFlagEnvironment', () => {
  it('uses the explicit feature flag environment', () => {
    vi.stubEnv('FEATURE_FLAG_ENVIRONMENT', 'production')

    expect(getFeatureFlagEnvironment()).toBe('production')
  })

  it('maps production Vercel deployments to production', () => {
    vi.stubEnv('FEATURE_FLAG_ENVIRONMENT', '')
    vi.stubEnv('VERCEL_ENV', 'production')

    expect(getFeatureFlagEnvironment()).toBe('production')
  })

  it('maps non-production deployments to staging', () => {
    vi.stubEnv('FEATURE_FLAG_ENVIRONMENT', '')
    vi.stubEnv('VERCEL_ENV', 'preview')

    expect(getFeatureFlagEnvironment()).toBe('staging')
  })
})
