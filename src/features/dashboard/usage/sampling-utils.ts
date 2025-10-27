import { UsageResponse } from '@/types/billing'
import { SampledDataPoint, SamplingMode, Timeframe } from './types'

/**
 * Threshold in days for switching to weekly sampling
 */
const WEEKLY_SAMPLING_THRESHOLD_DAYS = 90

/**
 * Determines the appropriate sampling mode based on timeframe duration
 */
export function determineSamplingMode(timeframe: Timeframe): SamplingMode {
  const rangeDays = (timeframe.end - timeframe.start) / (24 * 60 * 60 * 1000)
  return rangeDays >= WEEKLY_SAMPLING_THRESHOLD_DAYS ? 'weekly' : 'daily'
}

/**
 * Normalizes a timestamp to the nearest day start (00:00:00 UTC)
 *
 * Rounds to nearest day based on which half of the day the timestamp falls in:
 * - First half (00:00 - 11:59): rounds to THIS day's start
 * - Second half (12:00 - 23:59): rounds to NEXT day's start
 */
export function normalizeToStartOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  const hour = date.getUTCHours()

  // get this day's start
  const thisDayStart = new Date(date)
  thisDayStart.setUTCHours(0, 0, 0, 0)

  // determine if we're in the second half of the day
  const isSecondHalf = hour >= 12

  if (isSecondHalf) {
    // round to NEXT day's start
    const nextDayStart = new Date(thisDayStart)
    nextDayStart.setUTCDate(thisDayStart.getUTCDate() + 1)
    return nextDayStart.getTime()
  }

  // round to THIS day's start
  return thisDayStart.getTime()
}

/**
 * Normalizes a timestamp to the nearest ISO week start (Monday 00:00:00 UTC)
 *
 * Rounds to nearest week based on which half of the week the timestamp falls in:
 * - First half (Mon-Wed): rounds to THIS week's Monday
 * - Second half (Thu-Sun): rounds to NEXT week's Monday
 *
 * ISO weeks are aligned to a fixed reference (epoch), so they don't shift when timeframe changes
 */
export function normalizeToWeekStart(timestamp: number): number {
  const date = new Date(timestamp)

  // get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = date.getUTCDay()

  // calculate days to subtract to get to THIS week's Monday
  // if Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  // get this week's Monday
  const thisWeekMonday = new Date(date)
  thisWeekMonday.setUTCDate(date.getUTCDate() - daysToMonday)
  thisWeekMonday.setUTCHours(0, 0, 0, 0)

  // determine if we're in the second half of the week
  // Thursday (4), Friday (5), Saturday (6), Sunday (0) → second half
  const isSecondHalf = dayOfWeek === 0 || dayOfWeek >= 4

  if (isSecondHalf) {
    // round to NEXT week's Monday
    const nextWeekMonday = new Date(thisWeekMonday)
    nextWeekMonday.setUTCDate(thisWeekMonday.getUTCDate() + 7)
    return nextWeekMonday.getTime()
  }

  // round to THIS week's Monday
  return thisWeekMonday.getTime()
}

/**
 * Gets the end of the week (Sunday 23:59:59.999 UTC) for a given week start
 */
export function getWeekEnd(weekStart: number): number {
  const endDate = new Date(weekStart)
  endDate.setUTCDate(endDate.getUTCDate() + 6) // add 6 days to Monday = Sunday
  endDate.setUTCHours(23, 59, 59, 999)
  return endDate.getTime()
}

/**
 * Processes and samples raw usage data according to sampling mode and timeframe
 *
 * This is the single source of truth for data processing:
 * 1. Filters data to timeframe
 * 2. Applies sampling (aggregates to weeks if needed)
 * 3. Returns consistent data structure used by all consumers
 */
export function processUsageData(
  rawData: UsageResponse['day_usages'],
  timeframe: Timeframe,
  samplingMode: SamplingMode
): SampledDataPoint[] {
  // step 1: filter to timeframe
  const filteredData = rawData.filter((d) => {
    const ts = new Date(d.date).getTime()
    return ts >= timeframe.start && ts <= timeframe.end
  })

  if (filteredData.length === 0) {
    return []
  }

  // step 2: apply sampling
  if (samplingMode === 'weekly') {
    return aggregateToWeekly(filteredData, timeframe)
  }

  // daily mode: convert directly
  return filteredData.map((d) => ({
    timestamp: new Date(d.date).getTime(),
    sandboxCount: d.sandbox_count,
    cost: d.price_for_ram + d.price_for_cpu,
    vcpuHours: d.cpu_hours,
    ramGibHours: d.ram_gib_hours,
  }))
}

/**
 * Aggregates daily data into weekly buckets with normalized week boundaries
 */
function aggregateToWeekly(
  dailyData: UsageResponse['day_usages'],
  timeframe: Timeframe
): SampledDataPoint[] {
  // group data by normalized week
  const weeklyMap = new Map<number, SampledDataPoint>()

  dailyData.forEach((d) => {
    const dayTimestamp = new Date(d.date).getTime()
    const weekStart = normalizeToWeekStart(dayTimestamp)

    // get or create week bucket
    const existing = weeklyMap.get(weekStart)
    if (existing) {
      existing.sandboxCount += d.sandbox_count
      existing.cost += d.price_for_ram + d.price_for_cpu
      existing.vcpuHours += d.cpu_hours
      existing.ramGibHours += d.ram_gib_hours
    } else {
      weeklyMap.set(weekStart, {
        timestamp: weekStart,
        sandboxCount: d.sandbox_count,
        cost: d.price_for_ram + d.price_for_cpu,
        vcpuHours: d.cpu_hours,
        ramGibHours: d.ram_gib_hours,
      })
    }
  })

  // convert to sorted array and filter to ensure weeks are within timeframe
  return Array.from(weeklyMap.values())
    .filter((week) => {
      // include week if it has any overlap with timeframe
      const weekEnd = getWeekEnd(week.timestamp)
      return week.timestamp <= timeframe.end && weekEnd >= timeframe.start
    })
    .sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Finds the sampled data point for a hovered timestamp
 *
 * 1. Normalizes the hovered timestamp to start of day/week
 * 2. Looks for data at that normalized timestamp
 * 3. If not found, returns a zero-value point for that timestamp
 *
 * This ensures hover state always shows, even for periods with no data
 */
export function findHoveredDataPoint(
  sampledData: SampledDataPoint[],
  hoveredTimestamp: number,
  samplingMode: SamplingMode
): SampledDataPoint {
  // normalize timestamp based on sampling mode
  const normalizedTimestamp =
    samplingMode === 'weekly'
      ? normalizeToWeekStart(hoveredTimestamp)
      : normalizeToStartOfDay(hoveredTimestamp)

  // find existing data point at normalized timestamp
  const existingPoint = sampledData.find(
    (d) => d.timestamp === normalizedTimestamp
  )

  // return existing point or zero-value point
  return (
    existingPoint || {
      timestamp: normalizedTimestamp,
      sandboxCount: 0,
      cost: 0,
      vcpuHours: 0,
      ramGibHours: 0,
    }
  )
}

/**
 * Calculates totals from sampled data
 */
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
