export interface TimeSeriesPoint {
  x: number
  y: number
}

export interface FillTimeSeriesConfig<T> {
  start: number
  end: number
  step: number
  anomalousGapTolerance?: number
  timestampAccessorKey: keyof T
  emptyPointGenerator: (timestamp: number) => T
}

function isGapAnomalous(
  gapDuration: number,
  expectedStep: number,
  anomalousGapTolerance: number
): boolean {
  return gapDuration > expectedStep * (1 + anomalousGapTolerance)
}

function generateEmptyTimeSeries<T>(
  start: number,
  end: number,
  step: number,
  emptyPointGenerator: (timestamp: number) => T
): T[] {
  const result: T[] = []

  for (let timestamp = start; timestamp < end; timestamp += step) {
    result.push(emptyPointGenerator(timestamp))
  }

  return result
}

/**
 * Fills time series data with empty values to create smooth, continuous series for visualization.
 *
 * This function handles:
 * 1. Empty Data: Generates a complete empty-filled time series
 * 2. Anomalous Gaps: Fills all missing steps between data points when gap exceeds tolerance
 * 3. Viewport Boundaries: Always fills from first/last data points to config.start/end boundaries
 *
 * Anomalous gap detection is based on actual data points, not viewport boundaries.
 * Config start/end are used only as viewport limits, not for gap detection.
 *
 * CRITICAL: this logic is highly tested. do not modify without extensive testing
 */
export function fillTimeSeriesWithEmptyPoints<T>(
  data: T[],
  config: FillTimeSeriesConfig<T>
): T[] {
  const {
    start,
    end,
    step,
    anomalousGapTolerance = 0.5,
    timestampAccessorKey,
    emptyPointGenerator,
  } = config

  if (!data.length) {
    return generateEmptyTimeSeries(start, end, step, emptyPointGenerator)
  }

  // sort data by timestamp
  const sortedData = [...data].sort((a, b) => {
    const aTime = a[timestampAccessorKey] as number
    const bTime = b[timestampAccessorKey] as number
    return aTime - bTime
  })

  const result: T[] = []

  // fill backwards from first data point to config.start
  const firstTimestamp = sortedData[0]![timestampAccessorKey] as number
  for (let ts = firstTimestamp - step; ts >= start; ts -= step) {
    result.push(emptyPointGenerator(ts))
  }

  // add data points and fill gaps
  for (let i = 0; i < sortedData.length; i++) {
    const currentPoint = sortedData[i]!
    result.push(currentPoint)

    if (i === sortedData.length - 1) break

    const nextPoint = sortedData[i + 1]!
    const currentTimestamp = currentPoint[timestampAccessorKey] as number
    const nextTimestamp = nextPoint[timestampAccessorKey] as number
    const actualGap = nextTimestamp - currentTimestamp

    if (isGapAnomalous(actualGap, step, anomalousGapTolerance)) {
      // fill all missing timestamps at step intervals
      for (let ts = currentTimestamp + step; ts < nextTimestamp; ts += step) {
        result.push(emptyPointGenerator(ts))
      }
    }
  }

  // fill forwards from last data point to config.end
  const lastTimestamp = sortedData[sortedData.length - 1]![
    timestampAccessorKey
  ] as number
  for (let ts = lastTimestamp + step; ts <= end; ts += step) {
    result.push(emptyPointGenerator(ts))
  }

  // sort and strip potential overfetching
  const sorted = result.sort((a, b) => {
    const aTime = a[timestampAccessorKey] as number
    const bTime = b[timestampAccessorKey] as number
    return aTime - bTime
  })

  return sorted.filter((d) => {
    const timestamp = d[timestampAccessorKey] as number
    return timestamp >= start && timestamp <= end
  })
}

/**
 * Downsamples time series data by aggregating points into weekly buckets.
 * Each week's data is summed and assigned to the start of that week (Monday).
 *
 * @param data - Array of time series points to downsample
 * @returns Array of downsampled points with weekly aggregation
 */
export function downsampleToWeekly(data: TimeSeriesPoint[]): TimeSeriesPoint[] {
  if (!data.length) return []

  // Group data by week (Monday-based)
  const weeklyMap = new Map<number, number>()

  data.forEach((point) => {
    const timestamp =
      typeof point.x === 'number' ? point.x : new Date(point.x).getTime()
    const date = new Date(timestamp)

    // Get Monday of the week
    const dayOfWeek = date.getUTCDay()
    const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek // Adjust Sunday to previous Monday
    const monday = new Date(date)
    monday.setUTCDate(date.getUTCDate() + diff)
    monday.setUTCHours(0, 0, 0, 0)

    const weekStart = monday.getTime()

    // Aggregate values for this week
    const currentValue = weeklyMap.get(weekStart) || 0
    weeklyMap.set(weekStart, currentValue + point.y)
  })

  // Convert map to sorted array
  return Array.from(weeklyMap.entries())
    .map(([timestamp, value]) => ({ x: timestamp, y: value }))
    .sort((a, b) => {
      const timeA = typeof a.x === 'number' ? a.x : new Date(a.x).getTime()
      const timeB = typeof b.x === 'number' ? b.x : new Date(b.x).getTime()
      return timeA - timeB
    })
}

/**
 * Finds the weekly bucket that contains the given timestamp and returns its start timestamp.
 *
 * @param timestamp - The timestamp to find the week for
 * @returns The start timestamp (Monday) of the week containing the input timestamp
 */
export function getWeekStartForTimestamp(timestamp: number): number {
  const date = new Date(timestamp)
  const dayOfWeek = date.getUTCDay()
  const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek
  const monday = new Date(date)
  monday.setUTCDate(date.getUTCDate() + diff)
  monday.setUTCHours(0, 0, 0, 0)
  return monday.getTime()
}

/**
 * Gets the end timestamp (Sunday 23:59:59) for a given week start.
 *
 * @param weekStart - The start timestamp of the week (Monday)
 * @returns The end timestamp of that week (Sunday)
 */
export function getWeekEndForWeekStart(weekStart: number): number {
  const endDate = new Date(weekStart)
  endDate.setUTCDate(endDate.getUTCDate() + 6) // Move to Sunday
  endDate.setUTCHours(23, 59, 59, 999)
  return endDate.getTime()
}
