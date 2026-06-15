import 'server-only'

import {
  FEATURE_FLAGS,
  type FeatureFlagDefinition,
  type JsonFeatureFlagDefinition,
} from '@/configs/flags'
import type { FeatureFlagContextInput } from '@/core/server/feature-flags/context'
import { featureFlags } from '@/core/server/feature-flags/flags.server'

export type EvaluatedFeatureFlag = {
  id: string
  key: string
  kind: FeatureFlagDefinition['kind']
  description?: string
  value: unknown
  defaultValue: unknown
}

async function evaluateFeatureFlag(
  id: string,
  flag: FeatureFlagDefinition,
  context: FeatureFlagContextInput
): Promise<EvaluatedFeatureFlag> {
  const value =
    flag.kind === 'boolean'
      ? await featureFlags.getBoolean(flag, context)
      : await featureFlags.getJson(
          flag as JsonFeatureFlagDefinition<unknown>,
          context
        )

  return {
    id,
    key: flag.key,
    kind: flag.kind,
    description: flag.description,
    value,
    defaultValue: flag.defaultValue,
  }
}

export async function listFeatureFlags(context: FeatureFlagContextInput) {
  const flags = Object.entries(FEATURE_FLAGS) as [
    string,
    FeatureFlagDefinition,
  ][]

  return Promise.all(
    flags.map(([id, flag]) => evaluateFeatureFlag(id, flag, context))
  )
}
