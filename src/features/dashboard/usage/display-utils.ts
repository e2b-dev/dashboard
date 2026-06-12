import { getDateParts, type Timezone } from '@/features/dashboard/timezone'
import { formatCurrency, formatNumber } from '@/lib/utils/formatting'
import {
  determineSamplingMode,
  normalizeToEndOfSamplingPeriod,
  normalizeToStartOfSamplingPeriod,
} from './sampling-utils'
import type {
  DisplayValue,
  SampledDataPoint,
  SamplingMode,
  Timeframe,
} from './types'

const isThisYearInTimezone = (timestamp: number, timezone: Timezone): boolean =>
  getDateParts(timestamp, timezone).year ===
  getDateParts(new Date(), timezone).year

const formatZonedDay = (timestamp: number, timezone: Timezone): string =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: isThisYearInTimezone(timestamp, timezone) ? undefined : 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(timestamp)

const formatZonedHour = (timestamp: number, timezone: Timezone): string => {
  const date = new Date(timestamp)
  const day = formatZonedDay(timestamp, timezone)
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: true,
  })
    .format(date)
    .replace(/\s/g, '')
    .toLowerCase()

  return `${day}, ${hour}`
}

const formatZonedWeekRange = (
  startTimestamp: number,
  endTimestamp: number,
  timezone: Timezone
): string => {
  const startParts = getDateParts(startTimestamp, timezone)
  const endParts = getDateParts(endTimestamp, timezone)
  const sameYear = startParts.year === endParts.year
  const sameMonth = sameYear && startParts.month === endParts.month

  const startFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })

  const endFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    year: isThisYearInTimezone(endTimestamp, timezone) ? undefined : 'numeric',
  })

  if (sameMonth) {
    return `${startFormat.format(startTimestamp)} - ${endParts.day}`
  }

  return `${startFormat.format(startTimestamp)} - ${endFormat.format(endTimestamp)}`
}

/**
 * Format a timestamp to a human-readable date using Intl.DateTimeFormat
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatAxisDate(
  timestamp: number,
  samplingMode: SamplingMode,
  timezone: Timezone
): string {
  switch (samplingMode) {
    case 'hourly':
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        hour12: true,
      }).format(new Date(timestamp))
    default:
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
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
  timeframe: Timeframe,
  timezone: Timezone
): {
  sandboxes: DisplayValue
  cost: DisplayValue
  vcpu: DisplayValue
  ram: DisplayValue
} {
  let timestampLabel: string
  let label: string
  const samplingMode = determineSamplingMode(timeframe)

  const normalizedStartTimestamp = normalizeToStartOfSamplingPeriod(
    timeframe.start,
    samplingMode,
    timezone
  )
  const normalizedEndTimestamp = normalizeToStartOfSamplingPeriod(
    timeframe.end,
    samplingMode,
    timezone
  )
  const startBoundaryHour = normalizeToStartOfSamplingPeriod(
    timeframe.start,
    'hourly',
    timezone
  )
  const endBoundaryHour = normalizeToStartOfSamplingPeriod(
    timeframe.end,
    'hourly',
    timezone
  )

  const timestampIsAtStartEdge = timestamp === normalizedStartTimestamp
  const timestampIsAtEndEdge = timestamp === normalizedEndTimestamp

  switch (samplingMode) {
    case 'hourly':
      timestampLabel = formatZonedHour(timestamp, timezone)
      label = 'at'
      break

    case 'daily':
      if (timestampIsAtStartEdge && timestampIsAtEndEdge) {
        timestampLabel = `${formatZonedHour(startBoundaryHour, timezone)} - ${formatZonedHour(endBoundaryHour, timezone)}`
        label = 'during'
      } else if (timestampIsAtStartEdge) {
        timestampLabel = `${formatZonedHour(startBoundaryHour, timezone)} - end of ${formatZonedDay(timestamp, timezone)}`
        label = 'during'
      } else if (timestampIsAtEndEdge) {
        timestampLabel = `${formatZonedDay(timestamp, timezone)} - ${formatZonedHour(endBoundaryHour, timezone)}`
        label = 'during'
      } else {
        timestampLabel = formatZonedDay(timestamp, timezone)
        label = 'on'
      }
      break

    case 'weekly':
      if (timestampIsAtStartEdge && timestampIsAtEndEdge) {
        timestampLabel = `${formatZonedHour(startBoundaryHour, timezone)} - ${formatZonedHour(endBoundaryHour, timezone)}`
        label = 'during'
      } else if (timestampIsAtStartEdge) {
        const weekEnd = normalizeToEndOfSamplingPeriod(
          timestamp,
          'weekly',
          timezone
        )
        timestampLabel = `${formatZonedHour(startBoundaryHour, timezone)} - ${formatZonedDay(weekEnd, timezone)}`
        label = 'during'
      } else if (timestampIsAtEndEdge) {
        const weekStart = normalizeToStartOfSamplingPeriod(
          timestamp,
          'weekly',
          timezone
        )
        timestampLabel = `${formatZonedDay(weekStart, timezone)} - ${formatZonedHour(endBoundaryHour, timezone)}`
        label = 'during'
      } else {
        const weekEnd = normalizeToEndOfSamplingPeriod(
          timestamp,
          'weekly',
          timezone
        )
        timestampLabel = formatZonedWeekRange(timestamp, weekEnd, timezone)
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
      displayValue: formatCurrency(cost),
      label,
      timestamp: timestampLabel,
    },
    vcpu: {
      displayValue: formatNumber(vcpuHours, 'en-US', 2),
      label,
      timestamp: timestampLabel,
    },
    ram: {
      displayValue: formatNumber(ramGibHours, 'en-US', 2),
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
      displayValue: formatCurrency(totals.cost),
      label: 'total over range',
      timestamp: null,
    },
    vcpu: {
      displayValue: formatNumber(totals.vcpu, 'en-US', 2),
      label: 'total over range',
      timestamp: null,
    },
    ram: {
      displayValue: formatNumber(totals.ram, 'en-US', 2),
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
