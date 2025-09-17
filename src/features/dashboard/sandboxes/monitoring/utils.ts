import { TEAM_METRICS_BACKEND_COLLECTION_INTERVAL_MS } from '@/configs/intervals'
import { ClientTeamMetrics } from '@/types/sandboxes.types'

export function calculateStepForRange(startMs: number, endMs: number): number {
  const duration = endMs - startMs
  return calculateStepForDuration(duration)
}

// this function comes from e2b-dev/infra and is used to calculate the step for a given duration for /teams/$teamId/metrics
export function calculateStepForDuration(durationMs: number): number {
  const hour = 60 * 60 * 1000
  const minute = 60 * 1000
  const second = 1000

  switch (true) {
    case durationMs < hour:
      return 5 * second
    case durationMs < 6 * hour:
      return 30 * second
    case durationMs < 12 * hour:
      return minute
    case durationMs < 24 * hour:
      return 2 * minute
    case durationMs < 7 * 24 * hour:
      return 5 * minute
    default:
      return 15 * minute
  }
}

// FILL TEAM METRICS WITH ZEROS
// core function for rendering data coming from the back-end into the charts

/**
 * Creates a zero-valued team metrics data point for charts/visualizations.
 */
function _createZeroMetricPoint(timestamp: number): ClientTeamMetrics[0] {
  return {
    timestamp,
    concurrentSandboxes: 0,
    sandboxStartRate: 0,
  }
}

/**
 * Generates a complete time series filled with zero values when no data exists.
 */
function _generateEmptyTimeSeriesWithZeros(
  start: number,
  end: number,
  step: number
): ClientTeamMetrics {
  const calculatedStep = step > 0 ? step : calculateStepForRange(start, end)
  const result: ClientTeamMetrics = []

  for (let timestamp = start; timestamp < end; timestamp += calculatedStep) {
    result.push(_createZeroMetricPoint(timestamp))
  }

  return result
}

// determines if a gap between timestamps is considered anomalous
function _isGapAnomalous(
  gapDuration: number,
  expectedStep: number,
  anomalousGapTolerance: number
): boolean {
  return gapDuration > expectedStep * (1 + anomalousGapTolerance)
}

// adds zero-valued data points at the beginning of the time series if there's an anomalous gap
function _addStartPaddingZeros(
  result: ClientTeamMetrics,
  sortedData: ClientTeamMetrics,
  start: number,
  step: number,
  anomalousGapTolerance: number
): void {
  const firstDataPoint = sortedData[0]!
  const gapFromStart = firstDataPoint.timestamp - start
  const isStartAnomalous = _isGapAnomalous(
    gapFromStart,
    step,
    anomalousGapTolerance
  )

  if (isStartAnomalous) {
    result.push(_createZeroMetricPoint(start))

    const prefixZeroTimestamp = firstDataPoint.timestamp - step
    if (
      prefixZeroTimestamp > start &&
      prefixZeroTimestamp < firstDataPoint.timestamp
    ) {
      result.push(_createZeroMetricPoint(prefixZeroTimestamp))
    }
  }
}

// fills gaps between consecutive data points with zero values when gaps are anomalously large
function _fillIntermediateGapsWithZeros(
  result: ClientTeamMetrics,
  sortedData: ClientTeamMetrics,
  currentIndex: number,
  step: number,
  anomalousGapTolerance: number
): void {
  const currentPoint = sortedData[currentIndex]!
  const nextPoint = sortedData[currentIndex + 1]!
  const actualGap = nextPoint.timestamp - currentPoint.timestamp
  const isAnomalousGap = _isGapAnomalous(actualGap, step, anomalousGapTolerance)

  if (isAnomalousGap) {
    const hasSequenceBefore = currentIndex >= 1
    const hasDataAfter = currentIndex + 1 < sortedData.length

    // only fill gaps in the middle of data sequences, not at boundaries
    if (hasSequenceBefore && hasDataAfter) {
      const suffixZeroTimestamp = currentPoint.timestamp + step
      // add suffix zero if it fits in the gap
      if (
        suffixZeroTimestamp < nextPoint.timestamp &&
        suffixZeroTimestamp > currentPoint.timestamp
      ) {
        result.push(_createZeroMetricPoint(suffixZeroTimestamp))
      }

      const prefixZeroTimestamp = nextPoint.timestamp - step
      if (
        prefixZeroTimestamp > currentPoint.timestamp &&
        prefixZeroTimestamp < nextPoint.timestamp &&
        // ensure prefix and suffix zeros don't overlap
        prefixZeroTimestamp > suffixZeroTimestamp
      ) {
        result.push(_createZeroMetricPoint(prefixZeroTimestamp))
      }
    }
  }
}

// determines if zero values should be added at the end of the time series
function _shouldAddEndZeros(
  gapToEnd: number,
  step: number,
  anomalousGapTolerance: number
): boolean {
  const isEndAnomalous = _isGapAnomalous(gapToEnd, step, anomalousGapTolerance)

  return (
    (isEndAnomalous &&
      gapToEnd > TEAM_METRICS_BACKEND_COLLECTION_INTERVAL_MS) ||
    (step > 0 &&
      gapToEnd >= step * 3 &&
      gapToEnd > TEAM_METRICS_BACKEND_COLLECTION_INTERVAL_MS) ||
    gapToEnd >= 5 * 60 * 1000
  )
}

// adds zero-valued data points at the end of the time series if there's a significant gap
function _addEndPaddingZeros(
  result: ClientTeamMetrics,
  lastDataPoint: ClientTeamMetrics[0],
  end: number,
  step: number,
  anomalousGapTolerance: number
): void {
  const gapToEnd = end - lastDataPoint.timestamp

  if (_shouldAddEndZeros(gapToEnd, step, anomalousGapTolerance)) {
    const suffixZeroTimestamp = lastDataPoint.timestamp + step
    if (suffixZeroTimestamp < end) {
      result.push(_createZeroMetricPoint(suffixZeroTimestamp))
    }

    result.push(_createZeroMetricPoint(end - 1000))
  }
}

function _stripPotentialOverfetching(
  data: ClientTeamMetrics,
  start: number,
  end: number
): ClientTeamMetrics {
  return data.filter((d) => d.timestamp >= start && d.timestamp <= end)
}

/**
 * Fills team metrics data with zero values to create smooth, continuous time series for visualization.
 *
 * This function is critical for creating meaningful charts of team sandbox activity over time.
 * It handles several scenarios where raw metrics data would create poor user experiences:
 *
 * 1. **Empty Data**: When no metrics exist, generates a complete zero-filled time series
 * 2. **Sparse Data**: When data points are too far apart, adds zeros to show periods of inactivity
 * 3. **Boundary Gaps**: When requested time range extends beyond available data, pads with zeros
 * 4. **Activity Waves**: Creates clear visual separation between periods of activity and inactivity
 *
 * @param data - Array of team metrics with concurrentSandboxes and sandboxStartRate
 * @param start - Start timestamp (Unix milliseconds) for the desired time range
 * @param end - End timestamp (Unix milliseconds) for the desired time range
 * @param step - Expected interval (milliseconds) between data points
 * @param anomalousGapTolerance - Multiplier for detecting unusually large gaps (default 0.25 = 25%)
 * @returns Sorted array of metrics with zero-padding for smooth visualization
 */
export function fillTeamMetricsWithZeros(
  data: ClientTeamMetrics,
  start: number,
  end: number,
  step: number,
  anomalousGapTolerance: number = 0.25
): ClientTeamMetrics {
  // handle empty data case: generate complete zero-filled time series
  if (!data.length) {
    return _generateEmptyTimeSeriesWithZeros(start, end, step)
  }

  let sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp)
  const result: ClientTeamMetrics = []

  _addStartPaddingZeros(result, sortedData, start, step, anomalousGapTolerance)

  // handle single data point case: add the point and check for end padding
  if (data.length === 1) {
    const singlePoint = sortedData[0]!
    result.push(singlePoint)
    _addEndPaddingZeros(result, singlePoint, end, step, anomalousGapTolerance)
    const sorted = result.sort((a, b) => a.timestamp - b.timestamp)

    return _stripPotentialOverfetching(sorted, start, end)
  }

  for (let i = 0; i < sortedData.length; i++) {
    const currentPoint = sortedData[i]!
    result.push(currentPoint)

    if (i === sortedData.length - 1) {
      break
    }

    _fillIntermediateGapsWithZeros(
      result,
      sortedData,
      i,
      step,
      anomalousGapTolerance
    )
  }

  const lastDataPoint = sortedData[sortedData.length - 1]!
  _addEndPaddingZeros(result, lastDataPoint, end, step, anomalousGapTolerance)

  // re-sort the data
  sortedData = result.sort((a, b) => a.timestamp - b.timestamp)

  // strip potential overfetching coming from the server functions
  const strippedData = _stripPotentialOverfetching(sortedData, start, end)

  return strippedData
}
