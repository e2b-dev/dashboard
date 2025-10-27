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
