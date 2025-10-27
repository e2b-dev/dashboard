import { TimeSeriesPoint } from '@/lib/utils/time-series'
import type { ComputeDataPoint } from './types'

export function transformComputeData(
  data: TimeSeriesPoint[]
): ComputeDataPoint[] {
  return data.map((item) => {
    const timestamp =
      typeof item.x === 'number' ? item.x : new Date(item.x).getTime()
    const dateStr = new Date(timestamp).toISOString()

    return {
      x: timestamp,
      y: item.y,
      label: dateStr,
    }
  })
}

/**
 * Format a timestamp to a human-readable date using Intl.DateTimeFormat
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatAxisDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestamp))
}
