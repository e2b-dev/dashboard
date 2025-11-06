import { UsageResponse } from '@/types/billing.types'
import { startOfISOWeek } from 'date-fns'
import {
  HOURLY_SAMPLING_THRESHOLD_DAYS,
  WEEKLY_SAMPLING_THRESHOLD_DAYS,
} from './constants'
import { SampledDataPoint, SamplingMode, Timeframe } from './types'

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
  timeframe: Timeframe
): SampledDataPoint[] {
  if (!hourlyData || hourlyData.length === 0) {
    return []
  }

  return aggregateHours(hourlyData, timeframe)
}

export function normalizeToStartOfSamplingPeriod(
  timestamp: number,
  mode: SamplingMode
): number {
  const date = new Date(timestamp)

  switch (mode) {
    case 'hourly':
      return date.setMinutes(0, 0, 0)

    case 'daily':
      date.setMinutes(0, 0, 0)
      return date.setHours(0, 0, 0, 0)

    case 'weekly':
      date.setMinutes(0, 0, 0)
      date.setHours(0, 0, 0, 0)

      return startOfISOWeek(date).getTime()
  }
}

export function normalizeToEndOfSamplingPeriod(
  timestamp: number,
  mode: SamplingMode
): number {
  const date = new Date(timestamp)

  switch (mode) {
    case 'hourly':
      date.setMinutes(59, 59, 999)
      return date.getTime()

    case 'daily':
      date.setHours(23, 59, 59, 999)
      return date.getTime()

    case 'weekly':
      const weekStart = startOfISOWeek(date)
      weekStart.setDate(weekStart.getDate() + 6)
      weekStart.setHours(23, 59, 59, 999)
      return weekStart.getTime()
  }
}

/**
 * Aggregates hourly usage data into sampling periods (hourly, daily, or weekly).
 * For daily and weekly modes, partial buckets at the start and end of the timeframe
 * are truncated to align with the timeframe boundaries, normalized to hourly timestamps.
 */
function aggregateHours(
  hourlyData: UsageResponse['hour_usages'],
  timeframe: Timeframe
): SampledDataPoint[] {
  const samplingMode = determineSamplingMode(timeframe)

  // if sampling mode is hourly, return the hourly data
  if (samplingMode === 'hourly') {
    return hourlyData.map((d) => ({
      timestamp: d.timestamp,
      sandboxCount: d.sandbox_count,
      cost: d.price_for_ram + d.price_for_cpu,
      vcpuHours: d.cpu_hours,
      ramGibHours: d.ram_gib_hours,
    }))
  }

  // pre-calculate sampling period boundaries for edge bucket detection
  const timeframeStartPeriod = normalizeToStartOfSamplingPeriod(
    timeframe.start,
    samplingMode
  )
  const timeframeEndPeriod = normalizeToStartOfSamplingPeriod(
    timeframe.end,
    samplingMode
  )

  function createBucketKey(timestamp: number): number {
    const timestampPeriodStart = normalizeToStartOfSamplingPeriod(
      timestamp,
      samplingMode
    )

    // // check if timestamp is in the same sampling period as timeframe.start
    // if (timestampPeriodStart === timeframeStartPeriod) {
    //   return normalizeToStartOfSamplingPeriod(timeframe.start, 'hourly')
    // }

    // // check if timestamp is in the same sampling period as timeframe.end
    // if (timestampPeriodStart === timeframeEndPeriod) {
    //   return normalizeToStartOfSamplingPeriod(timeframe.end, 'hourly')
    // }

    // middle bucket: use full sampling period
    return timestampPeriodStart
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
      existing.vcpuHours += h.cpu_hours
      existing.ramGibHours += h.ram_gib_hours
    } else {
      bucketMap.set(bucketTimestampKey, {
        timestamp: bucketTimestampKey,
        sandboxCount: h.sandbox_count,
        cost: h.price_for_ram + h.price_for_cpu,
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
