import {
  SANDBOX_MONITORING_BYTES_IN_GIGABYTE,
  SANDBOX_MONITORING_CORE_LABEL_PLURAL,
  SANDBOX_MONITORING_CORE_LABEL_SINGULAR,
  SANDBOX_MONITORING_GIGABYTE_UNIT,
  SANDBOX_MONITORING_METRIC_VALUE_SEPARATOR,
  SANDBOX_MONITORING_TIME_LABEL_FORMAT_OPTIONS,
  SANDBOX_MONITORING_VALUE_UNAVAILABLE,
} from './constants'

const hoverTimestampFormatter = new Intl.DateTimeFormat(
  undefined,
  SANDBOX_MONITORING_TIME_LABEL_FORMAT_OPTIONS
)

export function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return SANDBOX_MONITORING_VALUE_UNAVAILABLE
  }

  return `${Math.round(value)}%`
}

export function formatCoreCount(value: number): string {
  const normalized = Math.max(0, Math.round(value))
  const label =
    normalized === 1
      ? SANDBOX_MONITORING_CORE_LABEL_SINGULAR
      : SANDBOX_MONITORING_CORE_LABEL_PLURAL

  return `${normalized} ${label}`
}

export function formatBytesToGb(bytes: number): string {
  const gigabytes = bytes / SANDBOX_MONITORING_BYTES_IN_GIGABYTE
  const rounded = gigabytes >= 10 ? gigabytes.toFixed(0) : gigabytes.toFixed(1)
  const normalized = rounded.replace(/\.0$/, '')

  return `${normalized} ${SANDBOX_MONITORING_GIGABYTE_UNIT}`
}

export function formatHoverTimestamp(timestampMs: number): string {
  return hoverTimestampFormatter.format(new Date(timestampMs))
}

export function formatMetricValue(primary: string, secondary: string): string {
  return `${primary}${SANDBOX_MONITORING_METRIC_VALUE_SEPARATOR}${secondary}`
}

export function calculateRatioPercent(used: number, total: number): number {
  if (total <= 0) {
    return 0
  }

  return (used / total) * 100
}
