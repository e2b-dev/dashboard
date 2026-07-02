import type { UsageResponse } from '@/core/modules/billing/models'

/** Rendered when usage can't be loaded (no billing yet, or API unavailable). */
export const EMPTY_USAGE: UsageResponse = {
  credits: 0,
  day_usages: [],
  hour_usages: [],
}
