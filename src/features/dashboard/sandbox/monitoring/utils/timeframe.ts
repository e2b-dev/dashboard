import type { SandboxInfo } from '@/types/api.types'
import {
  millisecondsInDay,
  millisecondsInHour,
  millisecondsInMinute,
  millisecondsInSecond,
} from 'date-fns/constants'
import { SANDBOX_MONITORING_MIN_RANGE_MS } from './constants'

export function calculateStepForRange(startMs: number, endMs: number): number {
  const duration = endMs - startMs
  return calculateStepForDuration(duration)
}

export function calculateStepForDuration(durationMs: number): number {
  switch (true) {
    case durationMs < millisecondsInHour:
      return 5 * millisecondsInSecond
    case durationMs < 6 * millisecondsInHour:
      return 30 * millisecondsInSecond
    case durationMs < 12 * millisecondsInHour:
      return millisecondsInMinute
    case durationMs < 24 * millisecondsInHour:
      return 2 * millisecondsInMinute
    case durationMs < 7 * millisecondsInDay:
      return 5 * millisecondsInMinute
    default:
      return 15 * millisecondsInMinute
  }
}

export interface SandboxLifecycleBounds {
  startMs: number
  anchorEndMs: number
  isRunning: boolean
}

export function getSandboxLifecycleBounds(
  sandboxInfo: Pick<SandboxInfo, 'startedAt' | 'endAt' | 'state'>,
  now: number = Date.now()
): SandboxLifecycleBounds | null {
  const startMs = new Date(sandboxInfo.startedAt).getTime()
  const endMs = new Date(sandboxInfo.endAt).getTime()

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return null
  }

  const isRunning = sandboxInfo.state === 'running'
  const anchorEndMs = isRunning ? Math.min(now, endMs) : endMs

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
    if (safeEnd + minRangeMs <= safeMax) {
      safeEnd = safeStart + minRangeMs
    } else {
      safeStart = safeEnd - minRangeMs
    }
  }

  safeStart = Math.max(safeMin, safeStart)
  safeEnd = Math.min(safeMax, safeEnd)

  return { start: safeStart, end: safeEnd }
}
