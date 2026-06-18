import 'server-only'

import type {
  EvaluationContext,
  EvaluationDetails,
  JsonValue,
} from '@openfeature/server-sdk'
import type { FeatureFlagContext } from '@/core/modules/feature-flags/context'
import type { FeatureFlagDefinition } from '@/core/modules/feature-flags/types'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { getOpenFeatureServerClient } from './openfeature-client.server'
import {
  type FeatureFlagProvider,
  type FeatureFlagSnapshot,
  unavailableSnapshot,
} from './provider.server'

function definedStringAttributes(
  attributes: Record<string, string | undefined>
) {
  return Object.fromEntries(
    Object.entries(attributes).filter((entry): entry is [string, string] => {
      const [, value] = entry
      return typeof value === 'string' && value.length > 0
    })
  )
}

export function createOpenFeatureEvaluationContext(
  context: FeatureFlagContext
): EvaluationContext {
  const user = {
    targetingKey: context.user.id,
    ...definedStringAttributes({
      email: context.user.email,
    }),
  }

  if (!context.team) {
    return {
      kind: 'user',
      ...user,
    }
  }

  return {
    kind: 'multi',
    user,
    team: {
      targetingKey: context.team.id,
      ...definedStringAttributes({
        name: context.team.name,
        slug: context.team.slug,
      }),
    },
  }
}

function logEvaluationError(
  flag: FeatureFlagDefinition,
  details: EvaluationDetails<boolean | JsonValue>
) {
  if (details.reason !== 'ERROR') {
    return
  }

  l.warn(
    {
      key: 'feature_flags:launchdarkly_evaluation_error',
      context: {
        flagKey: flag.key,
        errorCode: details.errorCode,
        errorMessage: details.errorMessage,
      },
    },
    'LaunchDarkly feature flag evaluation returned an error result'
  )
}

function toJsonValue(value: unknown): JsonValue {
  return value as JsonValue
}

export const launchDarklyOpenFeatureProvider: FeatureFlagProvider = {
  async evaluate(context, flags) {
    const client = await getOpenFeatureServerClient()

    if (!client) {
      return unavailableSnapshot
    }

    const evaluationContext = createOpenFeatureEvaluationContext(context)
    const flagValues = new Map<string, unknown>()
    const payloads = new Map<string, unknown>()

    try {
      await Promise.all(
        flags.map(async (flag) => {
          if (flag.kind === 'boolean') {
            const details = await client.getBooleanDetails(
              flag.key,
              flag.defaultValue,
              evaluationContext
            )
            logEvaluationError(flag, details)
            flagValues.set(flag.key, details.value)
            return
          }

          const details = await client.getObjectDetails(
            flag.key,
            toJsonValue(flag.defaultValue),
            evaluationContext
          )
          logEvaluationError(flag, details)
          payloads.set(flag.key, details.value)
        })
      )

      return {
        getFlagValue(key) {
          return flagValues.get(key)
        },
        getPayload(key) {
          return payloads.get(key)
        },
      } satisfies FeatureFlagSnapshot
    } catch (error) {
      l.warn(
        {
          key: 'feature_flags:launchdarkly_evaluation_failed',
          context: { flagKeys: flags.map((flag) => flag.key) },
          error: serializeErrorForLog(error),
        },
        'LaunchDarkly feature flag evaluation failed'
      )

      return unavailableSnapshot
    }
  },
}
