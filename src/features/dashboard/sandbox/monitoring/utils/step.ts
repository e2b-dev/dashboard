// this function comes from e2b-dev/infra and is used to calculate the metrics step for a given duration
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
