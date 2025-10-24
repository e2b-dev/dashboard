export interface TimeSeriesPoint {
  x: number | Date
  y: number
}

export interface FillTimeSeriesConfig {
  start: number
  end: number
  step: number
  anomalousGapTolerance?: number
}

function isGapAnomalous(
  gapDuration: number,
  expectedStep: number,
  anomalousGapTolerance: number
): boolean {
  return gapDuration > expectedStep * (1 + anomalousGapTolerance)
}

function generateEmptyTimeSeries(
  start: number,
  end: number,
  step: number
): TimeSeriesPoint[] {
  const result: TimeSeriesPoint[] = []

  for (let timestamp = start; timestamp < end; timestamp += step) {
    result.push({ x: timestamp, y: 0 })
  }

  return result
}

/**
 * Fills time series data with empty values to create smooth, continuous series for visualization.
 *
 * This function handles:
 * 1. Empty Data: Generates a complete empty-filled time series
 * 2. Sparse Data: Adds empty points to show periods of no activity
 * 3. Boundary Gaps: Pads with empty points at start/end of range
 *
 * CRITICAL: this logic is highly tested. do not modify without extensive testing
 */
export function fillTimeSeriesWithEmptyPoints(
  data: TimeSeriesPoint[],
  config: FillTimeSeriesConfig
): TimeSeriesPoint[] {
  const { start, end, step, anomalousGapTolerance = 0.5 } = config

  if (!data.length) {
    return generateEmptyTimeSeries(start, end, step)
  }

  // Sort data by timestamp
  const sortedData = [...data].sort((a, b) => {
    const timeA = typeof a.x === 'number' ? a.x : new Date(a.x).getTime()
    const timeB = typeof b.x === 'number' ? b.x : new Date(b.x).getTime()
    return timeA - timeB
  })

  const result: TimeSeriesPoint[] = []

  // Add start padding if needed
  const firstTimestamp =
    typeof sortedData[0]!.x === 'number'
      ? sortedData[0]!.x
      : new Date(sortedData[0]!.x).getTime()
  const gapFromStart = firstTimestamp - start
  if (isGapAnomalous(gapFromStart, step, anomalousGapTolerance)) {
    result.push({ x: start, y: 0 })

    const prefixZeroTimestamp = firstTimestamp - step
    if (prefixZeroTimestamp > start && prefixZeroTimestamp < firstTimestamp) {
      result.push({ x: prefixZeroTimestamp, y: 0 })
    }
  }

  // Add data points and fill gaps
  for (let i = 0; i < sortedData.length; i++) {
    const currentPoint = sortedData[i]!
    result.push(currentPoint)

    if (i === sortedData.length - 1) break

    const nextPoint = sortedData[i + 1]!
    const currentTimestamp =
      typeof currentPoint.x === 'number'
        ? currentPoint.x
        : new Date(currentPoint.x).getTime()
    const nextTimestamp =
      typeof nextPoint.x === 'number'
        ? nextPoint.x
        : new Date(nextPoint.x).getTime()
    const actualGap = nextTimestamp - currentTimestamp

    if (isGapAnomalous(actualGap, step, anomalousGapTolerance)) {
      const suffixZeroTimestamp = currentTimestamp + step
      if (
        suffixZeroTimestamp < nextTimestamp &&
        suffixZeroTimestamp > currentTimestamp
      ) {
        result.push({ x: suffixZeroTimestamp, y: 0 })
      }

      const prefixZeroTimestamp = nextTimestamp - step
      if (
        prefixZeroTimestamp > currentTimestamp &&
        prefixZeroTimestamp < nextTimestamp &&
        prefixZeroTimestamp > suffixZeroTimestamp
      ) {
        result.push({ x: prefixZeroTimestamp, y: 0 })
      }
    }
  }

  // Add end padding if needed
  const lastPoint = sortedData[sortedData.length - 1]!
  const lastTimestamp =
    typeof lastPoint.x === 'number'
      ? lastPoint.x
      : new Date(lastPoint.x).getTime()
  const gapToEnd = end - lastTimestamp

  // Add zeros at end if gap is significant (more than 2 steps)
  if (gapToEnd >= step * 2) {
    const suffixZeroTimestamp = lastTimestamp + step
    if (suffixZeroTimestamp < end) {
      result.push({ x: suffixZeroTimestamp, y: 0 })
    }

    result.push({ x: end - 1000, y: 0 })
  }

  // Sort and strip potential overfetching
  const sorted = result.sort((a, b) => {
    const timeA = typeof a.x === 'number' ? a.x : new Date(a.x).getTime()
    const timeB = typeof b.x === 'number' ? b.x : new Date(b.x).getTime()
    return timeA - timeB
  })

  return sorted.filter((d) => {
    const timestamp = typeof d.x === 'number' ? d.x : new Date(d.x).getTime()
    return timestamp >= start && timestamp <= end
  })
}
