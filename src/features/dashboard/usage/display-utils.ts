import type { Timezone } from '@/features/dashboard/timezone'
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

const getZonedYear = (value: number | Date, timezone: Timezone): number => {
  const year = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
  }).format(value)

  return Number.parseInt(year, 10)
}

const isThisYearInTimezone = (timestamp: number, timezone: Timezone): boolean =>
  getZonedYear(timestamp, timezone) === getZonedYear(new Date(), timezone)

const getZonedMonth = (timestamp: number, timezone: Timezone): number => {
  const month = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'numeric',
  }).format(timestamp)

  return Number.parseInt(month, 10)
}

const getZonedDayOfMonth = (timestamp: number, timezone: Timezone): number => {
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    day: 'numeric',
  }).format(timestamp)

  return Number.parseInt(day, 10)
}

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

const formatZonedDateRange = (
  startTimestamp: number,
  endTimestamp: number,
  timezone: Timezone
): string => {
  const startYear = getZonedYear(startTimestamp, timezone)
  const endYear = getZonedYear(endTimestamp, timezone)
  const sameYear = startYear === endYear
  const sameMonth =
    sameYear &&
    getZonedMonth(startTimestamp, timezone) ===
      getZonedMonth(endTimestamp, timezone)

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
    return `${startFormat.format(startTimestamp)} - ${getZonedDayOfMonth(endTimestamp, timezone)}`
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
 * Human-readable label for a sampled bucket, derived from its start timestamp.
 * Weekly buckets render as a date range and include the year when needed, so a
 * 7-day aggregate isn't presented as (or mistaken for) a single day.
 */
export function formatBucketLabel(
  timestamp: number,
  samplingMode: SamplingMode,
  timezone: Timezone
): string {
  switch (samplingMode) {
    case 'hourly':
      return formatZonedHour(timestamp, timezone)
    case 'weekly':
      return formatZonedDateRange(
        timestamp,
        normalizeToEndOfSamplingPeriod(timestamp, 'weekly', timezone),
        timezone
      )
    default:
      return formatZonedDay(timestamp, timezone)
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

  // edge bucket keys match the hour containing the timeframe boundary
  const normalizedStartTimestamp = normalizeToStartOfSamplingPeriod(
    timeframe.start,
    'hourly',
    timezone
  )
  const normalizedEndTimestamp = normalizeToStartOfSamplingPeriod(
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
        // both edges in same bucket - show precise range
        timestampLabel = `${formatZonedHour(normalizedStartTimestamp, timezone)} - ${formatZonedHour(normalizedEndTimestamp, timezone)}`
        label = 'during'
      } else if (timestampIsAtStartEdge) {
        timestampLabel = `${formatZonedHour(timestamp, timezone)} - end of ${formatZonedDay(timestamp, timezone)}`
        label = 'during'
      } else if (timestampIsAtEndEdge) {
        timestampLabel = `${formatZonedDay(timestamp, timezone)} - ${formatZonedHour(timestamp, timezone)}`
        label = 'during'
      } else {
        timestampLabel = formatZonedDay(timestamp, timezone)
        label = 'on'
      }
      break

    case 'weekly':
      if (timestampIsAtStartEdge && timestampIsAtEndEdge) {
        // both edges in same bucket - show precise range
        timestampLabel = `${formatZonedHour(normalizedStartTimestamp, timezone)} - ${formatZonedHour(normalizedEndTimestamp, timezone)}`
        label = 'during'
      } else if (timestampIsAtStartEdge) {
        // partial week at start - show from start hour to end of week
        const weekEnd = normalizeToEndOfSamplingPeriod(
          timestamp,
          'weekly',
          timezone
        )
        timestampLabel = `${formatZonedHour(timestamp, timezone)} - ${formatZonedDay(weekEnd, timezone)}`
        label = 'during'
      } else if (timestampIsAtEndEdge) {
        // partial week at end - show from start of week to end hour
        const weekStart = normalizeToStartOfSamplingPeriod(
          timestamp,
          'weekly',
          timezone
        )
        timestampLabel = `${formatZonedDay(weekStart, timezone)} - ${formatZonedHour(timestamp, timezone)}`
        label = 'during'
      } else {
        const weekEnd = normalizeToEndOfSamplingPeriod(
          timestamp,
          'weekly',
          timezone
        )
        timestampLabel = formatZonedDateRange(timestamp, weekEnd, timezone)
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
