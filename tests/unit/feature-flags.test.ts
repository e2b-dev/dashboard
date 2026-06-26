import { describe, expect, it, vi } from 'vitest'
import type { FeatureFlagContext } from '@/core/modules/feature-flags/context'
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
        getPayload: vi.fn().mockReturnValue(['e2b']),
      }),
    }

    const result = await createFeatureFlagService(provider).evaluateAll(context)

    expect(provider.evaluate).toHaveBeenCalledTimes(1)
    expect(provider.evaluate).toHaveBeenCalledWith(context, [
      FEATURE_FLAGS.agentsEnabled,
      FEATURE_FLAGS.isAdmin,
      FEATURE_FLAGS.newSandboxList,
      FEATURE_FLAGS.disableE2BAccessTokenProvisioning,
      FEATURE_FLAGS.trustedTemplateProviders,
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
      {
        id: 'newSandboxList',
        key: 'new_sandbox_list',
        kind: 'boolean',
        description:
          'Enables the new sandbox list with pagination and paused sandbox coverage.',
        defaultValue: false,
        value: true,
      },
      {
        id: 'disableE2BAccessTokenProvisioning',
        key: 'disable_e2b_access_token_provisioning',
        kind: 'boolean',
        description:
          'Disables provisioning of e2b access tokens via generateE2BUserAccessToken. When enabled, the legacy CLI flow shows an upgrade prompt and the createAccessToken tRPC mutation returns an error.',
        defaultValue: false,
        value: true,
      },
      {
        id: 'trustedTemplateProviders',
        key: 'trusted_template_providers',
        kind: 'payload',
        description:
          'Template providers whose namespaced templates can auto-start dashboard terminals.',
        defaultValue: [],
        value: ['e2b'],
      },
    ])
  })

  it('falls back to a payload default when the provider returns invalid data', async () => {
    const provider = {
      evaluate: vi.fn().mockResolvedValue({
        getFlagValue: vi.fn(),
        getPayload: vi.fn().mockReturnValue(['e2b', 123]),
      }),
    }

    const result = await createFeatureFlagService(provider).evaluateAll(context)

    expect(
      result.find((flag) => flag.id === 'trustedTemplateProviders')?.value
    ).toEqual([])
  })
})

describe('createOpenFeatureEvaluationContext', () => {
  it('maps dashboard users and teams to a LaunchDarkly multi-context', () => {
    expect(createOpenFeatureEvaluationContext(context)).toEqual({
      kind: 'multi',
      user: {
        targetingKey: 'user-id',
        email: 'user@example.com',
      },
      team: {
        targetingKey: 'team-id',
        name: 'Team Name',
        slug: 'team-slug',
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
    })
  })
})
