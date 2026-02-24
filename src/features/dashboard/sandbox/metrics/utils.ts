export function calculateStepForRange(startMs: number, endMs: number): number {
  const duration = endMs - startMs
  return calculateStepForDuration(duration)
}

// this function comes from e2b-dev/infra and is used to calculate the step for a given duration for /teams/$teamId/metrics
export function calculateStepForDuration(durationMs: number): number {
  const hour = 60 * 60 * 1000
  const minute = 60 * 1000
  const second = 1000

  switch (true) {
    case durationMs < hour:
      return 5 * second
    case durationMs < 6 * hour:
      return 30 * second
    case durationMs < 12 * hour:
      return minute
    case durationMs < 24 * hour:
      return 2 * minute
    case durationMs < 7 * 24 * hour:
      return 5 * minute
    default:
      return 15 * minute
  }
}

// TIMEFRAME LIVE STATE CALCULATION

const LIVE_THRESHOLD_PERCENT = 0.02
const LIVE_THRESHOLD_MIN_MS = 2_000

/**
 * Determines if a timeframe should be considered "live" based on how
 * recent the end timestamp is relative to current time.
 *
 * A timeframe is considered live if the end timestamp is within a threshold
 * of the current time. The threshold is the maximum of:
 * - 2% of the timeframe duration
 * - 60 seconds (minimum threshold)
 *
 * @param start - Start timestamp in milliseconds (or null)
 * @param end - End timestamp in milliseconds (or null)
 * @param now - Current timestamp in milliseconds (defaults to Date.now())
 * @returns True if the timeframe should be considered live
 */
export function calculateIsLive(
  start: number | null,
  end: number | null,
  now: number = Date.now()
): boolean {
  // default to live if params missing
  if (!start || !end) return true

  const duration = end - start
  const threshold = Math.max(
    duration * LIVE_THRESHOLD_PERCENT,
    LIVE_THRESHOLD_MIN_MS
  )

  return now - end < threshold
}
