import { formatAxisNumber } from '@/lib/utils/formatting'
import { ClientTeamMetric } from '@/types/sandboxes.types'
import type { TeamMetricDataPoint } from './types'

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
export function calculateAverage(data: TeamMetricDataPoint[]): number {
  if (data.length === 0) return 0

  let sum = 0
  const len = data.length

  for (let i = 0; i < len; i++) {
    sum += data[i]!.y
  }

  return sum / len
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
 * Shows decimals for small ranges to avoid duplicate labels
 */
export function createYAxisLabelFormatter(limit?: number, yAxisMax?: number) {
  // determine if we need decimal precision based on axis range
  const needsDecimals = yAxisMax !== undefined && yAxisMax <= 1

  const formatValue = (value: number): string => {
    if (needsDecimals) {
      // show 1 decimal for small ranges
      return value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      })
    }
    return formatAxisNumber(value)
  }

  if (limit === undefined) {
    return formatValue
  }

  const tolerance = limit * 0.05
  const minDistance = Math.max(tolerance, limit * 0.025)

  return (value: number): string => {
    if (Math.abs(value - limit) <= minDistance) {
      return ''
    }
    return formatValue(value)
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
