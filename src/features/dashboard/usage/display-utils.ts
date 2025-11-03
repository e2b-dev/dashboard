import {
  formatDateRange,
  formatDay,
  formatHour,
  formatNumber,
} from '@/lib/utils/formatting'
import {
  determineSamplingMode,
  normalizeToEndOfSamplingPeriod,
  normalizeToStartOfSamplingPeriod,
} from './sampling-utils'
import {
  DisplayValue,
  SampledDataPoint,
  SamplingMode,
  Timeframe,
} from './types'

/**
 * Format a timestamp to a human-readable date using Intl.DateTimeFormat
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatAxisDate(
  timestamp: number,
  samplingMode: SamplingMode
): string {
  switch (samplingMode) {
    case 'hourly':
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        hour12: true,
      }).format(new Date(timestamp))
    default:
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(new Date(timestamp))
  }
}

/**
 * Formats display values for a specific sampled data point (when hovering)
 */
export function formatHoveredValues(
  sandboxCount: number,
  cost: number,
  vcpuHours: number,
  ramGibHours: number,
  timestamp: number,
  timeframe: Timeframe
): {
  sandboxes: DisplayValue
  cost: DisplayValue
  vcpu: DisplayValue
  ram: DisplayValue
} {
  let timestampLabel: string
  let label: string
  const samplingMode = determineSamplingMode(timeframe)

  // edge bucket keys match the hour containing the timeframe boundary
  const normalizedStartTimestamp = normalizeToStartOfSamplingPeriod(
    timeframe.start,
    'hourly'
  )
  const normalizedEndTimestamp = normalizeToStartOfSamplingPeriod(
    timeframe.end,
    'hourly'
  )

  const timestampIsAtStartEdge = timestamp === normalizedStartTimestamp
  const timestampIsAtEndEdge = timestamp === normalizedEndTimestamp

  switch (samplingMode) {
    case 'hourly':
      timestampLabel = formatHour(timestamp)
      label = 'at'
      break

    case 'daily':
      if (timestampIsAtStartEdge && timestampIsAtEndEdge) {
        // both edges in same bucket - show precise range
        timestampLabel = `${formatHour(normalizedStartTimestamp)} - ${formatHour(normalizedEndTimestamp)}`
        label = 'during'
      } else if (timestampIsAtStartEdge) {
        // partial day at start - show from start hour to end of day
        const endOfDay = new Date(timestamp)
        endOfDay.setHours(23, 59, 59, 999)
        timestampLabel = `${formatHour(timestamp)} - end of ${formatDay(timestamp)}`
        label = 'during'
      } else if (timestampIsAtEndEdge) {
        // partial day at end - show from start of day to end hour
        const startOfDay = new Date(timestamp)
        startOfDay.setHours(0, 0, 0, 0)
        timestampLabel = `${formatDay(timestamp)} - ${formatHour(timestamp)}`
        label = 'during'
      } else {
        timestampLabel = formatDay(timestamp)
        label = 'on'
      }
      break

    case 'weekly':
      if (timestampIsAtStartEdge && timestampIsAtEndEdge) {
        // both edges in same bucket - show precise range
        timestampLabel = `${formatHour(normalizedStartTimestamp)} - ${formatHour(normalizedEndTimestamp)}`
        label = 'during'
      } else if (timestampIsAtStartEdge) {
        // partial week at start - show from start hour to end of week
        const weekEnd = normalizeToEndOfSamplingPeriod(timestamp, 'weekly')
        timestampLabel = `${formatHour(timestamp)} - ${formatDay(weekEnd)}`
        label = 'during'
      } else if (timestampIsAtEndEdge) {
        // partial week at end - show from start of week to end hour
        const weekStart = normalizeToStartOfSamplingPeriod(timestamp, 'weekly')
        timestampLabel = `${formatDay(weekStart)} - ${formatHour(timestamp)}`
        label = 'during'
      } else {
        const weekEnd = normalizeToEndOfSamplingPeriod(timestamp, 'weekly')
        timestampLabel = formatDateRange(timestamp, weekEnd)
        label = 'during week'
      }
      break
  }

  return {
    sandboxes: {
      displayValue: formatNumber(sandboxCount),
      label,
      timestamp: timestampLabel,
    },
    cost: {
      displayValue: `$${cost.toFixed(2)}`,
      label,
      timestamp: timestampLabel,
    },
    vcpu: {
      displayValue: formatNumber(vcpuHours),
      label,
      timestamp: timestampLabel,
    },
    ram: {
      displayValue: formatNumber(ramGibHours),
      label,
      timestamp: timestampLabel,
    },
  }
}

/**
 * Formats display values for total aggregates (no hover)
 */
export function formatTotalValues(totals: {
  sandboxes: number
  cost: number
  vcpu: number
  ram: number
}): {
  sandboxes: DisplayValue
  cost: DisplayValue
  vcpu: DisplayValue
  ram: DisplayValue
} {
  return {
    sandboxes: {
      displayValue: formatNumber(totals.sandboxes),
      label: 'total over range',
      timestamp: null,
    },
    cost: {
      displayValue: `$${totals.cost.toFixed(2)}`,
      label: 'total over range',
      timestamp: null,
    },
    vcpu: {
      displayValue: formatNumber(totals.vcpu),
      label: 'total over range',
      timestamp: null,
    },
    ram: {
      displayValue: formatNumber(totals.ram),
      label: 'total over range',
      timestamp: null,
    },
  }
}

/**
 * Formats display values for empty state (no data in range)
 */
export function formatEmptyValues(): {
  sandboxes: DisplayValue
  cost: DisplayValue
  vcpu: DisplayValue
  ram: DisplayValue
} {
  return {
    sandboxes: {
      displayValue: '0',
      label: 'no data in range',
      timestamp: null,
    },
    cost: {
      displayValue: '$0.00',
      label: 'no data in range',
      timestamp: null,
    },
    vcpu: {
      displayValue: '0',
      label: 'no data in range',
      timestamp: null,
    },
    ram: {
      displayValue: '0',
      label: 'no data in range',
      timestamp: null,
    },
  }
}

export function calculateTotals(sampledData: SampledDataPoint[]): {
  sandboxes: number
  cost: number
  vcpu: number
  ram: number
} {
  return sampledData.reduce(
    (acc, point) => ({
      sandboxes: acc.sandboxes + point.sandboxCount,
      cost: acc.cost + point.cost,
      vcpu: acc.vcpu + point.vcpuHours,
      ram: acc.ram + point.ramGibHours,
    }),
    { sandboxes: 0, cost: 0, vcpu: 0, ram: 0 }
  )
}
