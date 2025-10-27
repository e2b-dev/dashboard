import { TimeSeriesPoint } from './time-series'

export function calculateYAxisMax(
  data: TimeSeriesPoint[],
  scaleFactor: number
): number {
  if (data.length === 0) return 1

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

  return Math.max(calculatedMax, 1)
}

export function buildSeriesData(
  data: TimeSeriesPoint[]
): Array<{ value: [number, number] }> {
  return data.map((point) => ({
    value: [point.x instanceof Date ? point.x.getTime() : point.x, point.y],
  }))
}
