import {
  SANDBOX_MONITORING_PERCENT_MAX,
  SANDBOX_MONITORING_TIME_LABEL_FORMAT_OPTIONS,
} from './constants'

const hoverTimestampFormatter = new Intl.DateTimeFormat(
  undefined,
  SANDBOX_MONITORING_TIME_LABEL_FORMAT_OPTIONS
)

export function formatHoverTimestamp(timestampMs: number): string {
  return hoverTimestampFormatter.format(new Date(timestampMs))
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
