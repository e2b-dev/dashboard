import type { Timezone } from '@/features/dashboard/timezone'
import {
  SANDBOX_MONITORING_PERCENT_MAX,
  SANDBOX_MONITORING_TIME_LABEL_FORMAT_OPTIONS,
} from './constants'

export function formatHoverTimestamp(
  timestampMs: number,
  timezone: Timezone
): string {
  return new Intl.DateTimeFormat(undefined, {
    ...SANDBOX_MONITORING_TIME_LABEL_FORMAT_OPTIONS,
    timeZone: timezone,
  }).format(new Date(timestampMs))
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(SANDBOX_MONITORING_PERCENT_MAX, value))
}

export function calculateRatioPercent(used: number, total: number): number {
  if (total <= 0) {
    return 0
  }

  return clampPercent((used / total) * 100)
}
