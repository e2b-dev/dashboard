import { UsageResponse } from '@/types/billing'
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

export function processUsageData(
  hourlyData: UsageResponse['hour_usages'],
  samplingMode: SamplingMode
): SampledDataPoint[] {
  if (!hourlyData || hourlyData.length === 0) {
    return []
  }

  switch (samplingMode) {
    case 'hourly':
      return hourlyData.map((d) => ({
        timestamp: d.timestamp,
        sandboxCount: d.sandbox_count,
        cost: d.price_for_ram + d.price_for_cpu,
        vcpuHours: d.cpu_hours,
        ramGibHours: d.ram_gib_hours,
      }))

    case 'daily':
      return aggregateHours(hourlyData, 'daily')

    case 'weekly':
      return aggregateHours(hourlyData, 'weekly')
  }
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
      return date.setHours(0, 0, 0, 0)

    case 'weekly':
      const dayOfWeek = date.getDay()
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      date.setDate(date.getDate() - daysToSubtract)
      return date.setHours(0, 0, 0, 0)
  }
}

function aggregateHours(
  hourlyData: UsageResponse['hour_usages'],
  mode: Exclude<SamplingMode, 'hourly'>
): SampledDataPoint[] {
  const normalizeTimestamp =
    mode === 'daily'
      ? (timestamp: number) =>
          normalizeToStartOfSamplingPeriod(timestamp, 'daily')
      : (timestamp: number) =>
          normalizeToStartOfSamplingPeriod(timestamp, 'weekly')

  // group data by normalized bucket
  const bucketMap = new Map<number, SampledDataPoint>()

  hourlyData.forEach((h) => {
    const bucketStart = normalizeTimestamp(h.timestamp)

    // get or create bucket
    const existing = bucketMap.get(bucketStart)
    if (existing) {
      existing.sandboxCount += h.sandbox_count
      existing.cost += h.price_for_ram + h.price_for_cpu
      existing.vcpuHours += h.cpu_hours
      existing.ramGibHours += h.ram_gib_hours
    } else {
      bucketMap.set(bucketStart, {
        timestamp: bucketStart,
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
