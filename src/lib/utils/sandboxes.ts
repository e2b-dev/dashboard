import { SandboxesMetricsRecord } from '@/types/api'
import {
  ClientSandboxesMetrics,
  ClientTeamMetric,
  ClientTeamMetrics,
} from '@/types/sandboxes.types'

export function transformMetricsToClientMetrics(
  metrics: SandboxesMetricsRecord
): ClientSandboxesMetrics {
  return Object.fromEntries(
    Object.entries(metrics).map(([sandboxID, metric]) => [
      sandboxID,
      {
        cpuCount: metric.cpuCount,
        cpuUsedPct: Number(metric.cpuUsedPct.toFixed(2)),
        memUsedMb: Number((metric.memUsed / 1024 / 1024).toFixed(2)),
        memTotalMb: Number((metric.memTotal / 1024 / 1024).toFixed(2)),
        diskUsedGb: Number((metric.diskUsed / 1024 / 1024 / 1024).toFixed(2)),
        diskTotalGb: Number((metric.diskTotal / 1024 / 1024 / 1024).toFixed(2)),
        timestamp: metric.timestamp,
      },
    ])
  )
}

// This function replicates the back-end step calculation logic from e2b-dev/infra.
//
// https://github.com/e2b-dev/infra/blob/19778a715e8df3adea83858c798582d289bd7159/packages/api/internal/handlers/sandbox_metrics.go#L90
export function calculateTeamMetricsStep(start: Date, end: Date): number {
  const duration = end.getTime() - start.getTime()
  const hour = 60 * 60 * 1000
  const minute = 60 * 1000
  const second = 1000

  switch (true) {
    case duration < hour:
      return 5 * second
    case duration < 6 * hour:
      return 30 * second
    case duration < 12 * hour:
      return minute
    case duration < 24 * hour:
      return 2 * minute
    case duration < 7 * 24 * hour:
      return 5 * minute
    default:
      return 15 * minute
  }
}

/**
 * Fills missing timestamps in team metrics data with zero values.
 * The backend only sends non-zero deltas, so we need to fill gaps with zeros
 * according to the calculated step interval.
 *
 * @param data - Sparse metrics data from backend (only non-zero points)
 * @param start - Start timestamp in milliseconds
 * @param end - End timestamp in milliseconds
 * @returns Complete dataset with zero-filled gaps at regular intervals
 */
export function fillTeamMetricsWithZeros(
  data: ClientTeamMetrics,
  start: number,
  end: number
): ClientTeamMetrics {
  // Calculate the step interval in milliseconds
  const step = calculateTeamMetricsStep(new Date(start), new Date(end))

  // Create a map of existing data points for quick lookup
  const dataMap = new Map<number, ClientTeamMetric>()
  data.forEach((point) => {
    // Round timestamp to nearest step to handle slight timing variations
    const roundedTimestamp = Math.floor(point.timestamp / step) * step
    dataMap.set(roundedTimestamp, point)
  })

  // Generate complete time series with zeros for missing points
  const filledData: ClientTeamMetrics = []

  // Start from the first step-aligned timestamp >= start
  const startAligned = Math.ceil(start / step) * step
  // End at the last step-aligned timestamp <= end
  const endAligned = Math.floor(end / step) * step

  for (
    let timestamp = startAligned;
    timestamp <= endAligned;
    timestamp += step
  ) {
    const existingPoint = dataMap.get(timestamp)

    if (existingPoint) {
      // Use existing data point
      filledData.push(existingPoint)
    } else {
      // Fill with zeros for missing timestamp
      filledData.push({
        timestamp,
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      })
    }
  }

  return filledData
}
