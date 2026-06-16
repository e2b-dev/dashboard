import 'server-only'

import type {
  BooleanFeatureFlagDefinition,
  JsonFeatureFlagDefinition,
} from '@/configs/flags'
import type { FeatureFlagContextInput } from '@/core/server/feature-flags/context'
import { launchDarklyFeatureFlagProvider } from '@/core/server/feature-flags/launchdarkly'
import { postHogFeatureFlagProvider } from '@/core/server/feature-flags/posthog'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

export type FeatureFlagProvider = {
  getBoolean(
    flag: BooleanFeatureFlagDefinition,
    context: FeatureFlagContextInput
  ): Promise<boolean>
  getJson<T>(
    flag: JsonFeatureFlagDefinition<T>,
    context: FeatureFlagContextInput
  ): Promise<unknown>
}

export type FeatureFlagService = {
  getBoolean(
    flag: BooleanFeatureFlagDefinition,
    context: FeatureFlagContextInput
  ): Promise<boolean>
  getJson<T>(
    flag: JsonFeatureFlagDefinition<T>,
    context: FeatureFlagContextInput
  ): Promise<T>
}

export function createFeatureFlagService(
  provider: FeatureFlagProvider = launchDarklyFeatureFlagProvider
): FeatureFlagService {
  return {
    async getBoolean(flag, context) {
      return provider.getBoolean(flag, context)
    },
    async getJson(flag, context) {
      const value = await provider.getJson(flag, context)
      const parsed = flag.schema.safeParse(value)

      if (!parsed.success) {
        l.warn(
          {
            key: 'feature_flags:invalid_json_flag',
            context: { flagKey: flag.key },
            error: serializeErrorForLog(parsed.error),
          },
          'Feature flag JSON value has invalid shape'
        )

        return flag.defaultValue
      }

      return parsed.data
    },
  }
}

export const featureFlags = createFeatureFlagService()

// PostHog-backed service for flags evaluated against PostHog release conditions
// (e.g. environment-targeted, pre-auth gates) rather than LaunchDarkly.
export const postHogFeatureFlags = createFeatureFlagService(
  postHogFeatureFlagProvider
)
