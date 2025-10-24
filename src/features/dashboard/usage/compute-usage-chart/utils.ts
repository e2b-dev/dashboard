import { TimeSeriesPoint } from '@/lib/utils/time-series'
import type { ComputeDataPoint } from './types'

/**
 * Transform TimeSeriesPoint data into chart points with labels
 */
export function transformComputeData(
  data: TimeSeriesPoint[]
): ComputeDataPoint[] {
  return data.map((item) => {
    const timestamp = typeof item.x === 'number' ? item.x : new Date(item.x).getTime()
    const dateStr = new Date(timestamp).toISOString()
    
    return {
      x: timestamp,
      y: item.y,
      label: dateStr,
    }
  })
}

/**
 * Calculate y-axis max with nice rounding
 * Uses same logic as team metrics chart
 */
export function calculateYAxisMax(
  data: ComputeDataPoint[],
  scaleFactor: number
): number {
  if (data.length === 0) return 1

  // Find max in single pass
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

  const calculatedMax = snapToAxis(max * scaleFactor)

  // Ensure minimum y-axis range when all data is zero
  return Math.max(calculatedMax, 1)
}

/**
 * Build ECharts series data array
 */
export function buildSeriesData(
  data: ComputeDataPoint[]
): Array<{ value: [number, number]; label: string }> {
  return data.map((point) => ({
    value: [point.x, point.y],
    label: point.label,
  }))
}
