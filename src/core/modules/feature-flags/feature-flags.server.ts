import 'server-only'

import type { FeatureFlagContext } from '@/core/modules/feature-flags/context'
import {
  type BooleanFeatureFlagId,
  FEATURE_FLAGS,
  type FeatureFlagId,
} from '@/core/modules/feature-flags/definitions'
import type {
  EvaluatedFeatureFlag,
  FeatureFlagDefinition,
  PayloadFeatureFlagDefinition,
} from '@/core/modules/feature-flags/types'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { launchDarklyOpenFeatureProvider } from './launchdarkly-openfeature-provider.server'
import type {
  FeatureFlagProvider,
  FeatureFlagSnapshot,
} from './provider.server'

export type FeatureFlagService = {
  isEnabled(
    flagId: BooleanFeatureFlagId,
    context: FeatureFlagContext
  ): Promise<boolean>
  evaluateAll(context: FeatureFlagContext): Promise<EvaluatedFeatureFlag[]>
}

function logUnexpectedFlagValue(flag: FeatureFlagDefinition, value: unknown) {
  if (value === undefined) {
    return
  }

  l.warn(
    {
      key: 'feature_flags:unexpected_value',
      context: {
        flagKey: flag.key,
        expectedKind: flag.kind,
        actualType: typeof value,
      },
    },
    'Feature flag returned an unexpected value'
  )
}

function parsePayload<T>(
  flag: PayloadFeatureFlagDefinition<T>,
  payload: unknown
): T {
  if (payload === undefined) {
    return flag.defaultValue
  }

  const parsed = flag.schema.safeParse(payload)

  if (!parsed.success) {
    l.warn(
      {
        key: 'feature_flags:invalid_payload',
        context: { flagKey: flag.key },
        error: serializeErrorForLog(parsed.error),
      },
      'Feature flag payload has invalid shape'
    )

    return flag.defaultValue
  }

  return parsed.data
}

function getEvaluatedValue(
  flag: FeatureFlagDefinition,
  snapshot: FeatureFlagSnapshot
) {
  if (flag.kind === 'boolean') {
    const value = snapshot.getFlagValue(flag.key)

    if (typeof value === 'boolean') {
      return value
    }

    logUnexpectedFlagValue(flag, value)
    return flag.defaultValue
  }

  return parsePayload(flag, snapshot.getPayload(flag.key))
}

export function createFeatureFlagService(
  provider: FeatureFlagProvider = launchDarklyOpenFeatureProvider
): FeatureFlagService {
  return {
    async isEnabled(flagId, context) {
      const flag = FEATURE_FLAGS[flagId]
      const snapshot = await provider.evaluate(context, [flag])
      const value = snapshot.getFlagValue(flag.key)

      if (typeof value === 'boolean') {
        return value
      }

      logUnexpectedFlagValue(flag, value)
      return flag.defaultValue
    },

    async evaluateAll(context) {
      const flags = Object.entries(FEATURE_FLAGS) as [
        FeatureFlagId,
        FeatureFlagDefinition,
      ][]
      const snapshot = await provider.evaluate(
        context,
        flags.map(([, flag]) => flag)
      )

      return flags.map(([id, flag]) => ({
        id,
        key: flag.key,
        kind: flag.kind,
        description: flag.description,
        defaultValue: flag.defaultValue,
        value: getEvaluatedValue(flag, snapshot),
      }))
    },
  }
}

export const featureFlags = createFeatureFlagService()
