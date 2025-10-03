import { formatAxisNumber } from '@/lib/utils/formatting'
import { ClientTeamMetric } from '@/types/sandboxes.types'
import { TeamMetricDataPoint } from './types'

/**
 * Transform metrics array to chart data points
 * Single-pass transformation with zero copying
 */
export function transformMetrics(
  metrics: ClientTeamMetric[],
  valueKey: 'concurrentSandboxes' | 'sandboxStartRate'
): TeamMetricDataPoint[] {
  const len = metrics.length
  const result = new Array<TeamMetricDataPoint>(len)

  for (let i = 0; i < len; i++) {
    const metric = metrics[i]!
    result[i] = {
      x: metric.timestamp,
      y: metric[valueKey] ?? 0,
    }
  }

  return result
}

/**
 * Calculate average - single pass
 */
function calculateAverage(data: TeamMetricDataPoint[]): number {
  if (data.length === 0) return 0

  let sum = 0
  const len = data.length

  for (let i = 0; i < len; i++) {
    sum += data[i]!.y
  }

  return sum / len
}

/**
 * Calculate median - optimized with typed array for sorting
 */
function calculateMedian(data: TeamMetricDataPoint[]): number {
  const len = data.length
  if (len === 0) return 0

  // use Float64Array for faster sorting
  const values = new Float64Array(len)
  for (let i = 0; i < len; i++) {
    values[i] = data[i]!.y
  }

  values.sort()

  const mid = len >> 1 // bit shift for division by 2
  return len & 1 ? values[mid]! : (values[mid - 1]! + values[mid]!) / 2
}

/**
 * Calculate central tendency based on type
 */
export function calculateCentralTendency(
  data: TeamMetricDataPoint[],
  type: 'average' | 'median'
): number {
  return type === 'median' ? calculateMedian(data) : calculateAverage(data)
}

/**
 * Calculate y-axis max with snapping to nice values
 */
export function calculateYAxisMax(
  data: TeamMetricDataPoint[],
  scaleFactor: number,
  limit?: number
): number {
  if (data.length === 0) {
    return limit !== undefined ? Math.round(limit * 1.1) : 10
  }

  // find max in single pass
  let max = 0
  for (let i = 0; i < data.length; i++) {
    const y = data[i]!.y
    if (y > max) max = y
  }

  const snapToAxis = (value: number): number => {
    if (value < 10) return Math.ceil(value)
    if (value < 100) return Math.ceil(value / 10) * 10
    if (value < 1000) return Math.ceil(value / 50) * 50
    if (value < 10000) return Math.ceil(value / 100) * 100
    return Math.ceil(value / 1000) * 1000
  }

  if (limit !== undefined) {
    if (max > limit) {
      return snapToAxis(max * 1.1)
    }
    return Math.round(limit * 1.1)
  }

  return snapToAxis(max * scaleFactor)
}

/**
 * Check if data has recent points (for live indicator)
 */
export function hasLiveData(data: TeamMetricDataPoint[]): boolean {
  if (data.length === 0) return false

  const lastPoint = data[data.length - 1]!
  const now = Date.now()
  const twoMinutes = 2 * 60 * 1000

  return lastPoint.x > now - twoMinutes && lastPoint.x <= now
}

/**
 * Create Y-axis formatter that hides labels near limit line
 */
export function createYAxisLabelFormatter(limit?: number) {
  if (limit === undefined) {
    return (value: number) => formatAxisNumber(value)
  }

  const tolerance = limit * 0.1
  const minDistance = Math.max(tolerance, limit * 0.05)

  return (value: number): string => {
    if (Math.abs(value - limit) <= minDistance) {
      return ''
    }
    return formatAxisNumber(value)
  }
}

/**
 * Create split line interval function to avoid overlapping with limit
 */
export function createSplitLineInterval(limit?: number) {
  if (limit === undefined) {
    return () => true
  }

  const tolerance = limit * 0.1
  const minDistance = Math.max(tolerance, limit * 0.05)

  return (_index: number, value: string | number): boolean => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue)) return true
    return Math.abs(numValue - limit) > minDistance
  }
}

/**
 * Build ECharts series data array
 * Pre-allocate array for performance
 */
export function buildSeriesData(
  data: TeamMetricDataPoint[]
): [number, number][] {
  const len = data.length
  const result = new Array<[number, number]>(len)

  for (let i = 0; i < len; i++) {
    const point = data[i]!
    result[i] = [point.x, point.y]
  }

  return result
}

/**
 * Create live indicator mark points
 */
export function createLiveIndicators(
  lastPoint: TeamMetricDataPoint,
  lineColor: string
) {
  return {
    silent: true,
    animation: false,
    data: [
      // outer pulsing ring
      {
        coord: [lastPoint.x, lastPoint.y],
        symbol: 'circle',
        symbolSize: 16,
        itemStyle: {
          color: 'transparent',
          borderColor: lineColor,
          borderWidth: 1,
          shadowBlur: 8,
          shadowColor: lineColor,
          opacity: 0.4,
        },
        emphasis: { disabled: true },
        label: { show: false },
      },
      // middle ring
      {
        coord: [lastPoint.x, lastPoint.y],
        symbol: 'circle',
        symbolSize: 10,
        itemStyle: {
          color: lineColor,
          opacity: 0.3,
          borderWidth: 0,
        },
        emphasis: { disabled: true },
        label: { show: false },
      },
      // inner solid dot
      {
        coord: [lastPoint.x, lastPoint.y],
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: {
          color: lineColor,
          borderWidth: 0,
          shadowBlur: 4,
          shadowColor: lineColor,
        },
        emphasis: { disabled: true },
        label: { show: false },
      },
    ],
  }
}

/**
 * Create limit line mark line
 */
export function createLimitLine(
  limit: number,
  config: {
    errorHighlightColor: string
    errorBgColor: string
    bg1Color: string
    fontMono: string
  }
) {
  return {
    symbol: 'none',
    label: {
      show: true,
      fontFamily: config.fontMono,
    },
    lineStyle: {
      type: 'solid' as const,
      width: 1,
    },
    z: 1,
    emphasis: {
      disabled: true,
      tooltip: { show: false },
    },
    data: [
      {
        yAxis: limit,
        name: 'Limit',
        label: {
          formatter: formatAxisNumber(limit),
          position: 'start' as const,
          backgroundColor: config.bg1Color,
          color: config.errorHighlightColor,
          fontFamily: config.fontMono,
          borderRadius: 0,
          padding: [4, 4],
          style: {
            borderWidth: 0,
            borderColor: config.errorHighlightColor,
            backgroundColor: config.errorBgColor,
          },
        },
        lineStyle: {
          color: config.errorHighlightColor,
          opacity: 0.8,
          type: 'dashed' as const,
          width: 1,
        },
      },
    ],
  }
}
