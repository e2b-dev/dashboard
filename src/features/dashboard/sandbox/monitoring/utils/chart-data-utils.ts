import type { SandboxMetricsDataPoint } from '../types/sandbox-metrics-chart'
import { SANDBOX_MONITORING_CHART_LIVE_WINDOW_MS } from './constants'

export function toNumericValue(value: unknown): number {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    return Number(value)
  }

  return Number.NaN
}

export function formatXAxisLabel(
  value: number | string,
  includeSeconds: boolean = false
): string {
  const timestamp = Number(value)
  if (Number.isNaN(timestamp)) {
    return ''
  }

  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const base = `${hours}:${minutes}`

  if (!includeSeconds) {
    return base
  }

  const seconds = date.getSeconds().toString().padStart(2, '0')

  return `${base}:${seconds}`
}

export function formatEventTimestamp(timestampMs: number): string {
  const date = new Date(timestampMs)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')

  return `${hours}:${minutes}:${seconds}`
}

export function findLivePoint(
  data: SandboxMetricsDataPoint[],
  now: number = Date.now()
): { x: number; y: number } | null {
  const liveBoundary = now - SANDBOX_MONITORING_CHART_LIVE_WINDOW_MS

  for (let index = data.length - 1; index >= 0; index -= 1) {
    const point = data[index]
    if (!point) {
      continue
    }

    const [timestamp, value] = point
    if (typeof value !== 'number' || !Number.isFinite(timestamp)) {
      continue
    }

    if (timestamp > now) {
      continue
    }

    if (timestamp < liveBoundary) {
      return null
    }

    return {
      x: timestamp,
      y: value,
    }
  }

  return null
}

export function findClosestValidPoint(
  points: SandboxMetricsDataPoint[],
  targetTimestampMs: number
): { timestampMs: number; value: number; markerValue: number | null } | null {
  let closestPoint: {
    timestampMs: number
    value: number
    markerValue: number | null
  } | null = null
  let closestDistance = Number.POSITIVE_INFINITY

  for (const point of points) {
    if (!point) {
      continue
    }

    const [timestampMs, value, markerValue] = point
    if (value === null || !Number.isFinite(timestampMs)) {
      continue
    }

    const distance = Math.abs(timestampMs - targetTimestampMs)
    if (distance >= closestDistance) {
      continue
    }

    closestDistance = distance
    closestPoint = {
      timestampMs,
      value,
      markerValue: markerValue ?? null,
    }
  }

  return closestPoint
}

export function findFirstValidPointTimestampMs(
  points: SandboxMetricsDataPoint[]
): number | null {
  for (const point of points) {
    if (!point) {
      continue
    }

    const [timestampMs, value] = point
    if (value === null || !Number.isFinite(timestampMs)) {
      continue
    }

    return timestampMs
  }

  return null
}

export function splitLineDataIntoRenderableSegments(
  data: SandboxMetricsDataPoint[]
): SandboxMetricsDataPoint[][] {
  const segments: SandboxMetricsDataPoint[][] = []
  let currentSegment: SandboxMetricsDataPoint[] = []

  for (const point of data) {
    if (!point) {
      continue
    }

    const [timestampMs, value] = point
    const isRenderablePoint = value !== null && Number.isFinite(timestampMs)

    if (!isRenderablePoint) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment)
        currentSegment = []
      }
      continue
    }

    currentSegment.push(point)
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment)
  }

  return segments
}

export function segmentContainsPoint(
  segment: SandboxMetricsDataPoint[],
  point: { x: number; y: number }
): boolean {
  return segment.some(([timestampMs, value]) => {
    if (!Number.isFinite(timestampMs) || value === null) {
      return false
    }

    return timestampMs === point.x && value === point.y
  })
}
