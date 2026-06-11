import {
  formatZonedTimeAxisLabel,
  type Timezone,
} from '@/features/dashboard/timezone'
import type { SandboxMetricsDataPoint } from '../types/sandbox-metrics-chart'

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
  timezone: Timezone,
  includeSeconds: boolean = false
): string {
  const timestamp = Number(value)
  return formatZonedTimeAxisLabel(timestamp, timezone, includeSeconds)
}

export function findLivePoint(
  data: SandboxMetricsDataPoint[],
  liveWindowMs: number,
  now: number = Date.now()
): { x: number; y: number } | null {
  const liveBoundary = now - liveWindowMs

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
