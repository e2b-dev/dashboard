import 'server-only'

import { FEATURE_FLAGS } from '@/configs/flags'
import type { FeatureFlagContextInput } from '@/core/server/feature-flags/context'
import { featureFlags } from '@/core/server/feature-flags/flags.server'
import type { DashboardFeatures } from '@/features/dashboard/features'

export async function getDashboardFeatures(
  context: FeatureFlagContextInput
): Promise<DashboardFeatures> {
  return {
    isAdmin: await featureFlags.getBoolean(FEATURE_FLAGS.isAdmin, context),
  }
}
