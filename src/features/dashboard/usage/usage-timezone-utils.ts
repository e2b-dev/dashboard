import { type Timezone, UTC_TIMEZONE } from '@/features/dashboard/timezone'
import { findMatchingPreset } from '@/lib/utils/time-range'
import {
  getUsageTimeRangePresets,
  PRESET_MATCH_TOLERANCE_MS,
} from './constants'

export function resolveUsageTimezone(
  userTimezone: Timezone,
  isPinnedToUtc: boolean
): Timezone {
  return isPinnedToUtc ? UTC_TIMEZONE : userTimezone
}

/**
 * A preset-aligned timeframe describes calendar boundaries ("This month"), so
 * switching timezone re-anchors it to the new timezone's boundaries — that is
 * what makes totals match billing when pinning to UTC. Ranges within the
 * highlight tolerance of a preset are treated as that preset; only genuinely
 * custom ranges return null and are kept as picked.
 */
export function reanchorTimeframeToTimezone(
  timeframe: { start: number; end: number },
  fromTimezone: Timezone,
  toTimezone: Timezone
): { start: number; end: number } | null {
  const matchedPresetId = findMatchingPreset(
    getUsageTimeRangePresets(fromTimezone),
    timeframe.start,
    timeframe.end,
    PRESET_MATCH_TOLERANCE_MS
  )
  if (!matchedPresetId) return null

  const preset = getUsageTimeRangePresets(toTimezone).find(
    (candidate) => candidate.id === matchedPresetId
  )

  return preset?.getValue() ?? null
}

export function isBillingTimezoneBannerVisible(
  userTimezone: Timezone
): boolean {
  return userTimezone !== UTC_TIMEZONE
}
