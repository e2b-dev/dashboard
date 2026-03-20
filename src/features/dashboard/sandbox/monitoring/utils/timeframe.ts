import type { SandboxDetailsModel } from '@/core/modules/sandboxes/models'
import { calculateStepForDuration } from '@/features/dashboard/sandboxes/monitoring/utils'
import {
  SANDBOX_MONITORING_DEFAULT_RANGE_MS,
  SANDBOX_MONITORING_LIFECYCLE_PADDING_STEPS,
  SANDBOX_MONITORING_MAX_RANGE_MS,
  SANDBOX_MONITORING_MAX_TIMESTAMP_MS,
  SANDBOX_MONITORING_MIN_RANGE_MS,
  SANDBOX_MONITORING_MIN_TIMESTAMP_MS,
} from './constants'

export interface NormalizedMonitoringTimeframe {
  start: number
  end: number
}

export interface MonitoringQueryState {
  start: number | null
  end: number | null
}

interface NormalizeMonitoringTimeframeInput {
  start: number
  end: number
  now?: number
  minRangeMs?: number
  maxRangeMs?: number
}

interface ParseMonitoringQueryStateInput {
  start: string | null
  end: string | null
}

function clampToBounds(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return max
  }

  return Math.max(min, Math.min(max, Math.floor(value)))
}

function parseTimestampParam(value: string | null): number | null {
  if (!value) {
    return null
  }

  const normalizedValue = value.trim()
  if (!/^-?\d+$/.test(normalizedValue)) {
    return null
  }

  const parsed = Number(normalizedValue)
  if (!Number.isFinite(parsed)) {
    return null
  }

  if (
    parsed < SANDBOX_MONITORING_MIN_TIMESTAMP_MS ||
    parsed > SANDBOX_MONITORING_MAX_TIMESTAMP_MS
  ) {
    return null
  }

  return parsed
}

export function parseDateTimestampMs(
  value: string | null | undefined
): number | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value).getTime()
  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.floor(parsed)
}

export function parseMonitoringQueryState({
  start,
  end,
}: ParseMonitoringQueryStateInput): MonitoringQueryState {
  return {
    start: parseTimestampParam(start),
    end: parseTimestampParam(end),
  }
}

export function normalizeMonitoringTimeframe({
  start,
  end,
  now = Date.now(),
  minRangeMs = SANDBOX_MONITORING_MIN_RANGE_MS,
  maxRangeMs = SANDBOX_MONITORING_MAX_RANGE_MS,
}: NormalizeMonitoringTimeframeInput): NormalizedMonitoringTimeframe {
  const safeNow = clampToBounds(
    now,
    SANDBOX_MONITORING_MIN_TIMESTAMP_MS,
    SANDBOX_MONITORING_MAX_TIMESTAMP_MS
  )
  const safeMinBound = SANDBOX_MONITORING_MIN_TIMESTAMP_MS
  const safeMaxBound = safeNow
  const fallbackEnd = safeNow
  const fallbackStart = fallbackEnd - SANDBOX_MONITORING_DEFAULT_RANGE_MS

  let safeStart = Number.isFinite(start) ? start : fallbackStart
  let safeEnd = Number.isFinite(end) ? end : fallbackEnd

  safeStart = clampToBounds(safeStart, safeMinBound, safeMaxBound)
  safeEnd = clampToBounds(safeEnd, safeMinBound, safeMaxBound)

  if (safeEnd < safeStart) {
    ;[safeStart, safeEnd] = [safeEnd, safeStart]
  }

  if (safeEnd - safeStart > maxRangeMs) {
    safeStart = safeEnd - maxRangeMs
  }

  if (safeEnd - safeStart < minRangeMs) {
    safeStart = safeEnd - minRangeMs
  }

  safeStart = clampToBounds(safeStart, safeMinBound, safeMaxBound)
  safeEnd = clampToBounds(safeEnd, safeMinBound, safeMaxBound)

  if (safeEnd - safeStart < minRangeMs) {
    safeEnd = clampToBounds(safeStart + minRangeMs, safeMinBound, safeMaxBound)
    safeStart = clampToBounds(safeEnd - minRangeMs, safeMinBound, safeMaxBound)
  }

  if (safeEnd - safeStart > maxRangeMs) {
    safeStart = safeEnd - maxRangeMs
  }

  return {
    start: safeStart,
    end: safeEnd,
  }
}

export interface SandboxLifecycleBounds {
  startMs: number
  anchorEndMs: number
  isRunning: boolean
}

export function getSandboxLifecycleBounds(
  sandboxLifecycle: Pick<SandboxDetailsModel, 'state'> & {
    createdAt?: string | null
    pausedAt?: string | null
    endedAt?: string | null
  },
  now: number = Date.now()
): SandboxLifecycleBounds | null {
  const startMs = parseDateTimestampMs(sandboxLifecycle.createdAt)
  const isRunning = sandboxLifecycle.state === 'running'

  if (startMs === null) {
    return null
  }

  const safeNow = clampToBounds(
    now,
    SANDBOX_MONITORING_MIN_TIMESTAMP_MS,
    SANDBOX_MONITORING_MAX_TIMESTAMP_MS
  )
  const anchorTimestampMs = isRunning
    ? safeNow
    : sandboxLifecycle.state === 'paused'
      ? (parseDateTimestampMs(sandboxLifecycle.pausedAt) ?? safeNow)
      : (parseDateTimestampMs(sandboxLifecycle.endedAt) ?? safeNow)
  const anchorEndMs = Math.min(safeNow, anchorTimestampMs)

  const normalizedStart = Math.floor(Math.min(startMs, anchorEndMs))
  const normalizedEnd = Math.floor(Math.max(startMs, anchorEndMs))

  return {
    startMs: normalizedStart,
    anchorEndMs: normalizedEnd,
    isRunning,
  }
}

export function clampTimeframeToBounds(
  start: number,
  end: number,
  minBoundMs: number,
  maxBoundMs: number,
  minRangeMs: number = SANDBOX_MONITORING_MIN_RANGE_MS
) {
  const safeMin = Math.floor(Math.min(minBoundMs, maxBoundMs))
  const safeMax = Math.floor(Math.max(minBoundMs, maxBoundMs))
  const boundsDuration = safeMax - safeMin

  if (boundsDuration <= minRangeMs) {
    return { start: safeMin, end: safeMax }
  }

  let safeStart = Math.floor(start)
  let safeEnd = Math.floor(end)

  if (!Number.isFinite(safeStart)) {
    safeStart = safeMin
  }

  if (!Number.isFinite(safeEnd)) {
    safeEnd = safeMax
  }

  if (safeEnd <= safeStart) {
    safeEnd = safeStart + minRangeMs
  }

  const requestedDuration = safeEnd - safeStart
  if (requestedDuration >= boundsDuration) {
    return { start: safeMin, end: safeMax }
  }

  if (safeEnd > safeMax) {
    const shift = safeEnd - safeMax
    safeStart -= shift
    safeEnd -= shift
  }

  if (safeStart < safeMin) {
    const shift = safeMin - safeStart
    safeStart += shift
    safeEnd += shift
  }

  safeStart = Math.max(safeMin, safeStart)
  safeEnd = Math.min(safeMax, safeEnd)

  if (safeEnd - safeStart < minRangeMs) {
    if (safeStart + minRangeMs <= safeMax) {
      safeEnd = safeStart + minRangeMs
    } else {
      safeStart = safeEnd - minRangeMs
    }
  }

  safeStart = Math.max(safeMin, safeStart)
  safeEnd = Math.min(safeMax, safeEnd)

  return { start: safeStart, end: safeEnd }
}

/**
 * Computes lifecycle padding based on the aggregation step for the given duration.
 * Returns `SANDBOX_MONITORING_LIFECYCLE_PADDING_STEPS` × the step size.
 */
export function computeLifecyclePadding(durationMs: number): number {
  const step = calculateStepForDuration(Math.abs(durationMs))
  return SANDBOX_MONITORING_LIFECYCLE_PADDING_STEPS * step
}
