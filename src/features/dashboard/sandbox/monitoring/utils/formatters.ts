import { SANDBOX_MONITORING_PERCENT_MAX } from './constants'

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(SANDBOX_MONITORING_PERCENT_MAX, value))
}

export function calculateRatioPercent(used: number, total: number): number {
  if (total <= 0) {
    return 0
  }

  return clampPercent((used / total) * 100)
}
