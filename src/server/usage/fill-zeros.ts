import { ComputeUsageDelta, SandboxesUsageDelta } from './types'

/**
 * Generic type for data points with timestamp
 */
type TimeSeriesPoint<T = unknown> = {
  date: Date | string
} & T

/**
 * Calculate step for a given duration range
 */
function calculateStepForDuration(durationMs: number): number {
  const hour = 60 * 60 * 1000
  const minute = 60 * 1000
  const day = 24 * hour

  // For usage data, we use day-based steps since data is daily
  if (durationMs < 7 * day) {
    return day // 1 day
  }
  return day // Keep 1 day for all ranges since usage is daily
}

/**
 * Create a zero-valued data point for compute usage
 */
function createZeroComputePoint(date: Date): ComputeUsageDelta {
  return {
    date,
    ram_gb_hours: 0,
    vcpu_hours: 0,
    total_cost: 0,
  }
}

/**
 * Create a zero-valued data point for sandboxes usage
 */
function createZeroSandboxesPoint(date: Date): SandboxesUsageDelta {
  return {
    date,
    count: 0,
  }
}

/**
 * Generate empty time series with zeros for the given range
 */
function generateEmptyTimeSeries<T extends { date: Date | string }>(
  start: number,
  end: number,
  step: number,
  createZeroPoint: (date: Date) => T
): T[] {
  const result: T[] = []

  for (let timestamp = start; timestamp < end; timestamp += step) {
    result.push(createZeroPoint(new Date(timestamp)))
  }

  return result
}

/**
 * Check if gap between two timestamps is anomalous
 */
function isGapAnomalous(
  gapDuration: number,
  expectedStep: number,
  anomalousGapTolerance: number
): boolean {
  return gapDuration > expectedStep * (1 + anomalousGapTolerance)
}

/**
 * Fills usage data with zero values to create smooth, continuous time series for visualization.
 *
 * This function handles:
 * 1. Empty Data: Generates a complete zero-filled time series
 * 2. Sparse Data: Adds zeros to show periods of no activity
 * 3. Boundary Gaps: Pads with zeros at start/end of range
 *
 * @param data - Array of usage data points with date field
 * @param start - Start timestamp (Unix milliseconds) for the desired time range
 * @param end - End timestamp (Unix milliseconds) for the desired time range
 * @param createZeroPoint - Function to create a zero-valued data point
 * @param anomalousGapTolerance - Multiplier for detecting unusually large gaps (default 0.5 = 50%)
 * @returns Sorted array of data with zero-padding for smooth visualization
 */
function fillUsageDataWithZerosGeneric<T extends { date: Date | string }>(
  data: T[],
  start: number,
  end: number,
  createZeroPoint: (date: Date) => T,
  anomalousGapTolerance: number = 0.5
): T[] {
  const step = calculateStepForDuration(end - start)

  if (!data.length) {
    return generateEmptyTimeSeries(start, end, step, createZeroPoint)
  }

  // Sort data by timestamp
  const sortedData = [...data].sort((a, b) => {
    const timeA = new Date(a.date).getTime()
    const timeB = new Date(b.date).getTime()
    return timeA - timeB
  })

  const result: T[] = []

  // Add start padding if needed
  const firstTimestamp = new Date(sortedData[0]!.date).getTime()
  const gapFromStart = firstTimestamp - start
  if (isGapAnomalous(gapFromStart, step, anomalousGapTolerance)) {
    result.push(createZeroPoint(new Date(start)))

    const prefixZeroTimestamp = firstTimestamp - step
    if (prefixZeroTimestamp > start && prefixZeroTimestamp < firstTimestamp) {
      result.push(createZeroPoint(new Date(prefixZeroTimestamp)))
    }
  }

  // Add data points and fill gaps
  for (let i = 0; i < sortedData.length; i++) {
    const currentPoint = sortedData[i]!
    result.push(currentPoint)

    if (i === sortedData.length - 1) break

    const nextPoint = sortedData[i + 1]!
    const currentTimestamp = new Date(currentPoint.date).getTime()
    const nextTimestamp = new Date(nextPoint.date).getTime()
    const actualGap = nextTimestamp - currentTimestamp

    if (isGapAnomalous(actualGap, step, anomalousGapTolerance)) {
      const suffixZeroTimestamp = currentTimestamp + step
      if (
        suffixZeroTimestamp < nextTimestamp &&
        suffixZeroTimestamp > currentTimestamp
      ) {
        result.push(createZeroPoint(new Date(suffixZeroTimestamp)))
      }

      const prefixZeroTimestamp = nextTimestamp - step
      if (
        prefixZeroTimestamp > currentTimestamp &&
        prefixZeroTimestamp < nextTimestamp &&
        prefixZeroTimestamp > suffixZeroTimestamp
      ) {
        result.push(createZeroPoint(new Date(prefixZeroTimestamp)))
      }
    }
  }

  // Add end padding if needed
  const lastTimestamp = new Date(
    sortedData[sortedData.length - 1]!.date
  ).getTime()
  const gapToEnd = end - lastTimestamp

  // Add zeros at end if gap is significant (more than 2 days)
  if (gapToEnd >= step * 2) {
    const suffixZeroTimestamp = lastTimestamp + step
    if (suffixZeroTimestamp < end) {
      result.push(createZeroPoint(new Date(suffixZeroTimestamp)))
    }

    result.push(createZeroPoint(new Date(end - 1000)))
  }

  // Sort and strip potential overfetching
  const sorted = result.sort((a, b) => {
    const timeA = new Date(a.date).getTime()
    const timeB = new Date(b.date).getTime()
    return timeA - timeB
  })

  return sorted.filter((d) => {
    const timestamp = new Date(d.date).getTime()
    return timestamp >= start && timestamp <= end
  })
}

/**
 * Fill compute usage data with zeros
 */
export function fillComputeUsageWithZeros(
  data: ComputeUsageDelta[],
  start: number,
  end: number
): ComputeUsageDelta[] {
  return fillUsageDataWithZerosGeneric(data, start, end, createZeroComputePoint)
}

/**
 * Fill sandboxes usage data with zeros
 */
export function fillSandboxesUsageWithZeros(
  data: SandboxesUsageDelta[],
  start: number,
  end: number
): SandboxesUsageDelta[] {
  return fillUsageDataWithZerosGeneric(
    data,
    start,
    end,
    createZeroSandboxesPoint
  )
}
