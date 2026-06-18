import 'server-only'

import type { FeatureFlagContext } from '@/core/modules/feature-flags/context'
import type { FeatureFlagDefinition } from '@/core/modules/feature-flags/types'

export type FeatureFlagSnapshot = {
  getFlagValue(key: string): unknown
  getPayload(key: string): unknown
}

export type FeatureFlagProvider = {
  evaluate(
    context: FeatureFlagContext,
    flags: readonly FeatureFlagDefinition[]
  ): Promise<FeatureFlagSnapshot>
}

export const unavailableSnapshot: FeatureFlagSnapshot = {
  getFlagValue: () => undefined,
  getPayload: () => undefined,
}
