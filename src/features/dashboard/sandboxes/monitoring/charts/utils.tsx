import { calculateTeamMetricsStep } from '@/configs/mock-data'
import { type LineSeries } from '@/ui/charts/types'

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
 * Calculates central tendency (average or median) for pre-aggregated time series data.
 *
 * The input data points are already aggregated by the backend (e.g., 5-minute averages).
 * This function performs secondary aggregation across those time periods.
 *
 * Use average for metrics where total capacity matters (concurrent sandboxes).
 * Use median for metrics with high variability where outliers distort the mean (start rates).
 *
 * @param data Array of pre-aggregated data points from backend
 * @param type Calculation method - 'average' for mean, 'median' for middle value
 * @returns Object containing the calculated value and type used
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

  const snapToAxis = (value: number): number => {
    if (value < 10) return Math.ceil(value)
    if (value < 100) return Math.ceil(value / 10) * 10
    if (value < 1000) return Math.ceil(value / 50) * 50
    if (value < 10000) return Math.ceil(value / 100) * 100
    return Math.ceil(value / 1000) * 1000
  }

  if (limit !== undefined) {
    // when data exceeds limit, show max data value with padding and snapping
    if (maxDataValue > limit) {
      return snapToAxis(maxDataValue * limitPadding)
    }

    // when data is below limit, always show limit with padding
    return Math.round(limit * limitPadding)
  }

  // no limit defined - use scaling value with snapping
  return snapToAxis(maxDataValue * scaleFactor)
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
