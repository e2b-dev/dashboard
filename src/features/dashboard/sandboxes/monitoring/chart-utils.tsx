import { calculateTeamMetricsStep } from '@/configs/mock-data'
import { ClientTeamMetrics } from '@/types/sandboxes.types'
import { LineSeries } from '@/ui/data/line-chart.utils'

export function calculateAverage(
  data: Array<{ x: unknown; y: number | null }>
) {
  if (!data.length) return 0
  return data.reduce((acc, cur) => acc + (cur.y || 0), 0) / data.length
}

/**
 * Calculates the median value from data points.
 * Median is resistant to outliers and shows the "typical" value.
 * Use this when you want to understand what most users experience.
 */
export function calculateMedian(data: Array<{ x: unknown; y: number | null }>) {
  if (!data.length) return 0

  const values = data
    .map((d) => d.y || 0)
    .filter((v) => v !== null)
    .sort((a, b) => a - b)

  if (values.length === 0) return 0

  const mid = Math.floor(values.length / 2)

  if (values.length % 2 === 0) {
    return (values[mid - 1]! + values[mid]!) / 2
  }

  return values[mid]!
}

export type CentralTendencyMeasure = {
  value: number
  type: 'average' | 'median'
}

/**
 * Returns either average (mean) or median with appropriate symbol.
 *
 * IMPORTANT: The input data points are already pre-aggregated by the backend
 * (e.g., each point is a 5-minute average). This function calculates:
 * - Average of averages (for concurrent sandboxes)
 * - Median of averages (for start rates)
 *
 * Use AVERAGE (x̄) for:
 * - Concurrent sandboxes: Shows mean resource load across time periods
 * - Metrics where total capacity matters
 *
 * Use MEDIAN (x̃) for:
 * - Start rates: Shows typical rate, filtering out burst periods
 * - Metrics with high variability where outliers distort the mean
 *
 * @param data - Array of pre-aggregated data points from backend
 * @param useMedian - true for median (bursty data), false for average (capacity)
 */
export function calculateCentralTendency(
  data: Array<{ x: unknown; y: number | null }>,
  type: 'average' | 'median'
): CentralTendencyMeasure {
  if (!data.length) {
    return { value: 0, type: 'average' }
  }

  if (type === 'median') {
    return {
      value: calculateMedian(data),
      type: 'median',
    }
  }

  return {
    value: calculateAverage(data),
    type: 'average',
  }
}

export function calculateYAxisMax(
  data: Array<{ y: number | null }>,
  limit?: number,
  scaleFactor: number = 1.25,
  limitPadding: number = 1.1
): number {
  if (data.length === 0) {
    return limit !== undefined ? Math.round(limit * limitPadding) : 10
  }

  const maxDataValue = Math.max(...data.map((d) => d.y || 0))

  if (limit !== undefined) {
    const limitVisibilityThreshold = limit * 0.8

    if (maxDataValue >= limitVisibilityThreshold) {
      return Math.round(limit * limitPadding)
    }

    // snap to fine-grained divisions for clean axis values
    const scaledValue = maxDataValue * scaleFactor

    // use 1/20th of limit for more granular steps
    const divisionValue = limit / 20
    const numberOfDivisions = Math.ceil(scaledValue / divisionValue)
    const snappedValue = numberOfDivisions * divisionValue

    // never snap exactly to limit - apply padding instead
    if (snappedValue >= limit) {
      return Math.round(limit * limitPadding)
    }

    return snappedValue
  }

  // round to nice numbers when no limit
  const scaledValue = maxDataValue * scaleFactor

  if (scaledValue < 10) {
    return Math.ceil(scaledValue)
  } else if (scaledValue < 100) {
    return Math.ceil(scaledValue / 10) * 10
  } else if (scaledValue < 1000) {
    return Math.ceil(scaledValue / 50) * 50
  } else if (scaledValue < 10000) {
    return Math.ceil(scaledValue / 100) * 100
  } else {
    return Math.ceil(scaledValue / 1000) * 1000
  }
}

export function createMonitoringChartOptions({
  timeframe,
  splitNumber = 2,
}: {
  timeframe: { start: number; end: number; isLive: boolean }
  splitNumber?: number
}) {
  return {
    xAxis: {
      type: 'time' as const,
      min: timeframe.start,
      max:
        timeframe.end +
        (timeframe.isLive
          ? calculateTeamMetricsStep(timeframe.start, timeframe.end)
          : 0),
    },
    yAxis: {
      splitNumber,
    },
  }
}

export function transformMetricsToLineData<T>(
  metrics: T[],
  getTimestamp: (item: T) => number | Date,
  getValue: (item: T) => number | null
): Array<{ x: number | Date; y: number | null }> {
  return metrics.map((item) => ({
    x: getTimestamp(item),
    y: getValue(item),
  }))
}

export function createChartSeries({
  id,
  name,
  data,
  lineColor,
  areaColors,
}: {
  id: string
  name: string
  data: Array<{ x: number | Date; y: number | null }>
  lineColor: string
  areaColors?: {
    from: string
    to: string
  }
}) {
  const series: LineSeries = {
    id,
    name,
    data: data.map((d) => ({ x: d.x, y: d.y || 0 })),
    lineStyle: {
      color: lineColor,
    },
  }

  if (areaColors) {
    series.areaStyle = {
      color: {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          {
            offset: 0,
            color: areaColors.from,
          },
          {
            offset: 1,
            color: areaColors.to,
          },
        ],
      },
    }
  }

  return series
}

/**
 * Fill gaps in team metrics with zeros for charting
 * Detects anomalous gaps and adds zeros at start/end and between data waves
 * The step parameter is the expected/display step - we detect when actual data
 * intervals are larger than this and fill the gaps
 *
 * Note: Backend overfetches by one step to capture boundary points,
 * so if the last point is close to the end, it likely means activity continued
 */
export function fillMetricsWithZeros(
  data: ClientTeamMetrics,
  start: number,
  end: number,
  step: number,
  anomalousGapTolerance: number = 0.25
): ClientTeamMetrics {
  if (!data.length) {
    // calculate appropriate step for empty data
    const calculatedStep =
      step > 0 ? step : calculateTeamMetricsStep(start, end)
    const result: ClientTeamMetrics = []

    // fill entire range with zeros at calculated step
    for (let timestamp = start; timestamp < end; timestamp += calculatedStep) {
      result.push({
        timestamp,
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      })
    }

    return result
  }

  if (data.length < 2) {
    return [...data].sort((a, b) => a.timestamp - b.timestamp)
  }

  const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp)
  const result: ClientTeamMetrics = []

  // check if we should add zeros at the start
  const firstDataPoint = sortedData[0]!
  const gapFromStart = firstDataPoint.timestamp - start
  const isStartAnomalous = gapFromStart > step * (1 + anomalousGapTolerance)

  if (isStartAnomalous) {
    result.push({
      timestamp: start,
      concurrentSandboxes: 0,
      sandboxStartRate: 0,
    })

    const prefixZeroTimestamp = firstDataPoint.timestamp - step
    if (
      prefixZeroTimestamp > start &&
      prefixZeroTimestamp < firstDataPoint.timestamp
    ) {
      result.push({
        timestamp: prefixZeroTimestamp,
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      })
    }
  }

  // add data points and fill gaps between ALL points
  // this is key: we use the expected step to detect anomalies,
  // not the actual data interval (which might be wrong)
  for (let i = 0; i < sortedData.length; i++) {
    const currentPoint = sortedData[i]!
    result.push(currentPoint)

    if (i === sortedData.length - 1) {
      break
    }

    const nextPoint = sortedData[i + 1]!
    const actualGap = nextPoint.timestamp - currentPoint.timestamp

    // detect gaps based on EXPECTED step, not actual data intervals
    // this is crucial: if API returns 1-hour intervals but we expect 5 minutes,
    // we need to detect this as anomalous and fill the gaps
    const tolerance = step * anomalousGapTolerance
    const isAnomalousGap = actualGap > step + tolerance

    if (isAnomalousGap) {
      // always fill gaps when detected, even between first points
      // this handles the case where API returns 1-hour intervals
      // but we expect 5-minute intervals

      // fill zero after the current point
      const suffixZeroTimestamp = currentPoint.timestamp + step
      if (suffixZeroTimestamp < nextPoint.timestamp) {
        result.push({
          timestamp: suffixZeroTimestamp,
          concurrentSandboxes: 0,
          sandboxStartRate: 0,
        })
      }

      // fill zero before the next point
      const prefixZeroTimestamp = nextPoint.timestamp - step
      if (
        prefixZeroTimestamp > currentPoint.timestamp &&
        prefixZeroTimestamp < nextPoint.timestamp
      ) {
        result.push({
          timestamp: prefixZeroTimestamp,
          concurrentSandboxes: 0,
          sandboxStartRate: 0,
        })
      }
    }
  }

  // check if we should add zeros at the end
  const lastDataPoint = sortedData[sortedData.length - 1]!
  const gapToEnd = end - lastDataPoint.timestamp

  // check if last data point is beyond or very close to the end
  // this indicates the backend overfetched and activity likely continued
  const isLastPointBeyondEnd = lastDataPoint.timestamp >= end
  const isLastPointNearBoundary = gapToEnd <= step * 0.5 // within half a step

  // be conservative about adding end zeros when data is near boundary
  // only add if there's a significant gap or we're certain activity stopped
  const shouldAddEndZeros =
    !isLastPointBeyondEnd &&
    !isLastPointNearBoundary &&
    // significant gap (more than 2 steps)
    ((step > 0 && gapToEnd >= step * 2) ||
      // or very large gap (more than 5 minutes)
      gapToEnd >= 5 * 60 * 1000)

  if (shouldAddEndZeros) {
    const suffixZeroTimestamp = lastDataPoint.timestamp + step
    if (suffixZeroTimestamp < end) {
      result.push({
        timestamp: suffixZeroTimestamp,
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      })
    }

    result.push({
      timestamp: end - 1000,
      concurrentSandboxes: 0,
      sandboxStartRate: 0,
    })
  }

  return result.sort((a, b) => a.timestamp - b.timestamp)
}
