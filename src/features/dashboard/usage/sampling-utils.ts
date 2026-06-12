import type { UsageResponse } from '@/core/modules/billing/models'
import {
  getDateTimeParts,
  shiftCalendarDays,
  type Timezone,
  type CalendarDateTimeParts,
  dateTimePartsToUtcTimestamp,
} from '@/features/dashboard/timezone'
import {
  HOURLY_SAMPLING_THRESHOLD_DAYS,
  WEEKLY_SAMPLING_THRESHOLD_DAYS,
} from './constants'
import type { SampledDataPoint, SamplingMode, Timeframe } from './types'

const getIsoWeekStartParts = (
  parts: Pick<CalendarDateTimeParts, 'year' | 'month' | 'day'>
): Pick<CalendarDateTimeParts, 'year' | 'month' | 'day'> => {
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
  const parts = getDateTimeParts(timestamp, timezone)

  switch (mode) {
    case 'hourly':
      return dateTimePartsToUtcTimestamp(
        { ...parts, minutes: 0, seconds: 0 },
        timezone
      )

    case 'daily':
      return dateTimePartsToUtcTimestamp(
        { ...parts, hours: 0, minutes: 0, seconds: 0 },
        timezone
      )

    case 'weekly': {
      const weekStart = getIsoWeekStartParts(parts)

      return dateTimePartsToUtcTimestamp(
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
  const parts = getDateTimeParts(timestamp, timezone)

  switch (mode) {
    case 'hourly':
      return (
        dateTimePartsToUtcTimestamp(
          { ...parts, minutes: 59, seconds: 59 },
          timezone
        ) + 999
      )

    case 'daily':
      return (
        dateTimePartsToUtcTimestamp(
          { ...parts, hours: 23, minutes: 59, seconds: 59 },
          timezone
        ) + 999
      )

    case 'weekly': {
      const weekStart = getIsoWeekStartParts(parts)
      const weekEnd = shiftCalendarDays(weekStart, 6)

      return (
        dateTimePartsToUtcTimestamp(
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
 * Daily and weekly bucket timestamps represent the selected-zone start of that
 * calendar period while totals include the hourly points returned for the query range.
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
