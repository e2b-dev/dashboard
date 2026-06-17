import 'server-only'

import type { AllFlagsOptions } from 'posthog-node'
import type { FeatureFlagContext } from '@/core/modules/feature-flags/context'
import { getFeatureFlagEnvironment } from '@/core/modules/feature-flags/context'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { getPostHogServerClient } from './posthog-client.server'

export type FeatureFlagValue = boolean | string | undefined

export type FeatureFlagSnapshot = {
  getFlagValue(key: string): FeatureFlagValue
  getPayload(key: string): unknown
}

export type FeatureFlagProvider = {
  evaluate(
    context: FeatureFlagContext,
    flagKeys: readonly string[]
  ): Promise<FeatureFlagSnapshot>
}

const unavailableSnapshot: FeatureFlagSnapshot = {
  getFlagValue: () => undefined,
  getPayload: () => undefined,
}

let loggedMissingPostHogKey = false

function stringProperties(properties: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(properties).filter((entry): entry is [string, string] => {
      const [, value] = entry
      return typeof value === 'string' && value.length > 0
    })
  )
}

export function createPostHogFlagEvaluationOptions(
  context: FeatureFlagContext,
  flagKeys: readonly string[]
): AllFlagsOptions {
  const environment = context.environment ?? getFeatureFlagEnvironment()
  const personProperties = stringProperties({
    email: context.user.email,
    environment,
  })

  const options: AllFlagsOptions = {
    flagKeys: [...flagKeys],
    disableGeoip: true,
  }

  if (Object.keys(personProperties).length > 0) {
    options.personProperties = personProperties
  }

  if (context.team) {
    options.groups = {
      team: context.team.id,
    }

    const teamProperties = stringProperties({
      name: context.team.name,
      slug: context.team.slug,
      environment,
    })

    if (Object.keys(teamProperties).length > 0) {
      options.groupProperties = {
        team: teamProperties,
      }
    }
  }

  return options
}

export const postHogFeatureFlagProvider: FeatureFlagProvider = {
  async evaluate(context, flagKeys) {
    const client = getPostHogServerClient()

    if (!client) {
      if (!loggedMissingPostHogKey) {
        loggedMissingPostHogKey = true
        l.warn(
          { key: 'feature_flags:posthog_unconfigured' },
          'PostHog feature flags are disabled because NEXT_PUBLIC_POSTHOG_KEY is missing'
        )
      }

      return unavailableSnapshot
    }

    try {
      const evaluatedFlags = await client.evaluateFlags(
        context.user.id,
        createPostHogFlagEvaluationOptions(context, flagKeys)
      )

      return {
        getFlagValue(key) {
          const value = evaluatedFlags.getFlag(key)
          return typeof value === 'boolean' || typeof value === 'string'
            ? value
            : undefined
        },
        getPayload(key) {
          return evaluatedFlags.getFlagPayload(key)
        },
      }
    } catch (error) {
      l.warn(
        {
          key: 'feature_flags:posthog_evaluation_failed',
          context: { flagKeys },
          error: serializeErrorForLog(error),
        },
        'PostHog feature flag evaluation failed'
      )

      return unavailableSnapshot
    }
  },
}
