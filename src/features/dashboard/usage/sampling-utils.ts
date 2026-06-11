import type { UsageResponse } from '@/core/modules/billing/models'
import {
  type Timezone,
  zonedDateTimePartsToUtcTimestamp,
} from '@/features/dashboard/timezone'
import {
  HOURLY_SAMPLING_THRESHOLD_DAYS,
  WEEKLY_SAMPLING_THRESHOLD_DAYS,
} from './constants'
import type { SampledDataPoint, SamplingMode, Timeframe } from './types'

interface ZonedDateTimeParts {
  year: number
  month: number
  day: number
  hours: number
  minutes: number
  seconds: number
}

const getZonedDateTimeParts = (
  timestamp: number,
  timezone: Timezone
): ZonedDateTimeParts => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(timestamp)
    .reduce<Record<string, string>>((result, part) => {
      if (
        part.type === 'year' ||
        part.type === 'month' ||
        part.type === 'day' ||
        part.type === 'hour' ||
        part.type === 'minute' ||
        part.type === 'second'
      ) {
        result[part.type] = part.value
      }

      return result
    }, {})

  const year = Number.parseInt(parts.year ?? '', 10)
  const month = Number.parseInt(parts.month ?? '', 10)
  const day = Number.parseInt(parts.day ?? '', 10)
  const hours = Number.parseInt(parts.hour ?? '', 10)
  const minutes = Number.parseInt(parts.minute ?? '', 10)
  const seconds = Number.parseInt(parts.second ?? '', 10)

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    Number.isNaN(seconds)
  ) {
    throw new Error('Unable to format usage sampling timestamp')
  }

  return { year, month, day, hours, minutes, seconds }
}

// Shifts a selected-zone calendar date without applying browser timezone rules; e.g. Tuesday + -1 -> Monday.
const shiftCalendarDays = (
  parts: Pick<ZonedDateTimeParts, 'year' | 'month' | 'day'>,
  days: number
): Pick<ZonedDateTimeParts, 'year' | 'month' | 'day'> => {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  date.setUTCDate(date.getUTCDate() + days)

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

const getIsoWeekStartParts = (
  parts: Pick<ZonedDateTimeParts, 'year' | 'month' | 'day'>
): Pick<ZonedDateTimeParts, 'year' | 'month' | 'day'> => {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  const daysSinceMonday = (date.getUTCDay() + 6) % 7
  return shiftCalendarDays(parts, -daysSinceMonday)
}

export function determineSamplingMode(timeframe: Timeframe): SamplingMode {
  const rangeDays = (timeframe.end - timeframe.start) / (24 * 60 * 60 * 1000)

  if (rangeDays <= HOURLY_SAMPLING_THRESHOLD_DAYS) {
    return 'hourly'
  }

  if (rangeDays >= WEEKLY_SAMPLING_THRESHOLD_DAYS) {
    return 'weekly'
  }

  return 'daily'
}

export function getSamplingModeStepMs(samplingMode: SamplingMode): number {
  switch (samplingMode) {
    case 'hourly':
      return 60 * 60 * 1000
    case 'daily':
      return 24 * 60 * 60 * 1000
    case 'weekly':
      return 7 * 24 * 60 * 60 * 1000
  }
}

export function processUsageData(
  hourlyData: UsageResponse['hour_usages'],
  timeframe: Timeframe,
  timezone: Timezone
): SampledDataPoint[] {
  if (!hourlyData || hourlyData.length === 0) {
    return []
  }

  return aggregateHours(hourlyData, timeframe, timezone)
}

export function normalizeToStartOfSamplingPeriod(
  timestamp: number,
  mode: SamplingMode,
  timezone: Timezone
): number {
  const parts = getZonedDateTimeParts(timestamp, timezone)

  switch (mode) {
    case 'hourly':
      return zonedDateTimePartsToUtcTimestamp(
        { ...parts, minutes: 0, seconds: 0 },
        timezone
      )

    case 'daily':
      return zonedDateTimePartsToUtcTimestamp(
        { ...parts, hours: 0, minutes: 0, seconds: 0 },
        timezone
      )

    case 'weekly': {
      const weekStart = getIsoWeekStartParts(parts)

      return zonedDateTimePartsToUtcTimestamp(
        {
          ...weekStart,
          hours: 0,
          minutes: 0,
          seconds: 0,
        },
        timezone
      )
    }
  }
}

export function normalizeToEndOfSamplingPeriod(
  timestamp: number,
  mode: SamplingMode,
  timezone: Timezone
): number {
  const parts = getZonedDateTimeParts(timestamp, timezone)

  switch (mode) {
    case 'hourly':
      return (
        zonedDateTimePartsToUtcTimestamp(
          { ...parts, minutes: 59, seconds: 59 },
          timezone
        ) + 999
      )

    case 'daily':
      return (
        zonedDateTimePartsToUtcTimestamp(
          { ...parts, hours: 23, minutes: 59, seconds: 59 },
          timezone
        ) + 999
      )

    case 'weekly': {
      const weekStart = getIsoWeekStartParts(parts)
      const weekEnd = shiftCalendarDays(weekStart, 6)

      return (
        zonedDateTimePartsToUtcTimestamp(
          {
            ...weekEnd,
            hours: 23,
            minutes: 59,
            seconds: 59,
          },
          timezone
        ) + 999
      )
    }
  }
}

/**
 * Aggregates hourly usage data into sampling periods (hourly, daily, or weekly).
 * For daily and weekly modes, partial buckets at the start and end of the timeframe
 * are truncated to align with the timeframe boundaries, normalized to hourly timestamps.
 */
function aggregateHours(
  hourlyData: UsageResponse['hour_usages'],
  timeframe: Timeframe,
  timezone: Timezone
): SampledDataPoint[] {
  const samplingMode = determineSamplingMode(timeframe)

  // if sampling mode is hourly, return the hourly data
  if (samplingMode === 'hourly') {
    return hourlyData.map((d) => ({
      timestamp: d.timestamp,
      sandboxCount: d.sandbox_count,
      cost: d.price_for_ram + d.price_for_cpu,
      cpuCost: d.price_for_cpu,
      ramCost: d.price_for_ram,
      vcpuHours: d.cpu_hours,
      ramGibHours: d.ram_gib_hours,
    }))
  }

  function createBucketKey(timestamp: number): number {
    return normalizeToStartOfSamplingPeriod(timestamp, samplingMode, timezone)
  }

  // group data by timestamp buckets
  const bucketMap = new Map<number, SampledDataPoint>()

  hourlyData.forEach((h) => {
    const bucketTimestampKey = createBucketKey(h.timestamp)

    // get or create bucket
    const existing = bucketMap.get(bucketTimestampKey)
    if (existing) {
      existing.sandboxCount += h.sandbox_count
      existing.cost += h.price_for_ram + h.price_for_cpu
      existing.cpuCost += h.price_for_cpu
      existing.ramCost += h.price_for_ram
      existing.vcpuHours += h.cpu_hours
      existing.ramGibHours += h.ram_gib_hours
    } else {
      bucketMap.set(bucketTimestampKey, {
        timestamp: bucketTimestampKey,
        sandboxCount: h.sandbox_count,
        cost: h.price_for_ram + h.price_for_cpu,
        cpuCost: h.price_for_cpu,
        ramCost: h.price_for_ram,
        vcpuHours: h.cpu_hours,
        ramGibHours: h.ram_gib_hours,
      })
    }
  })

  // convert to sorted array
  return Array.from(bucketMap.values()).sort(
    (a, b) => a.timestamp - b.timestamp
  )
}
