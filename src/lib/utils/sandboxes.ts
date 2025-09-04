import { TEAM_METRICS_BACKEND_COLLECTION_INTERVAL_MS } from '@/configs/intervals'
import { SandboxesMetricsRecord } from '@/types/api'
import {
  ClientSandboxesMetrics,
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

/**
 * detects anomalies in team metrics data and fills exactly one zero between "waves" of data.
 * calculates step from the first two data points and detects gaps in sequences.
 */
// calculate step based on time range duration
function calculateStepForRange(startMs: number, endMs: number): number {
  const duration = endMs - startMs
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

export function fillTeamMetricsWithZeros(
  data: ClientTeamMetrics,
  start: number,
  end: number,
  step: number,
  anomalousGapTolerance: number = 0.25
): ClientTeamMetrics {
  if (!data.length) {
    // calculate appropriate step for empty data
    const calculatedStep = step > 0 ? step : calculateStepForRange(start, end)
    const result: ClientTeamMetrics = []

    // fill entire range with zeros at calculated step
    for (let timestamp = start; timestamp < end; timestamp += calculatedStep) {
      result.push({
        timestamp,
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      })
    }

    // ensure we have a point at the end
    if (
      result.length === 0 ||
      result[result.length - 1]!.timestamp < end - 1000
    ) {
      result.push({
        timestamp: end - 1000,
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      })
    }

    return result
  }

  if (data.length < 2) {
    return data.sort((a, b) => a.timestamp - b.timestamp)
  }

  const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp)
  const result: ClientTeamMetrics = []

  // check if we should add zeros at the start
  const firstDataPoint = sortedData[0]!
  const gapFromStart = firstDataPoint.timestamp - start
  const isStartAnomalous = gapFromStart > step * (1 + anomalousGapTolerance)

  if (isStartAnomalous) {
    result.push({
      timestamp: start,
      concurrentSandboxes: 0,
      sandboxStartRate: 0,
    })

    const prefixZeroTimestamp = firstDataPoint.timestamp - step
    if (
      prefixZeroTimestamp > start &&
      prefixZeroTimestamp < firstDataPoint.timestamp
    ) {
      result.push({
        timestamp: prefixZeroTimestamp,
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      })
    }
  }

  for (let i = 0; i < sortedData.length; i++) {
    const currentPoint = sortedData[i]!
    result.push(currentPoint)

    if (i === sortedData.length - 1) {
      break
    }

    const nextPoint = sortedData[i + 1]!
    const actualGap = nextPoint.timestamp - currentPoint.timestamp
    const expectedStep = step

    // allow some tolerance for step variations (±20%)
    const tolerance = expectedStep * anomalousGapTolerance
    const isAnomalousGap = actualGap > expectedStep + tolerance

    if (isAnomalousGap) {
      const hasSequenceBefore = i >= 1
      const hasDataAfter = i + 1 < sortedData.length

      if (hasSequenceBefore && hasDataAfter) {
        // fill zero after the current wave (suffix)
        const suffixZeroTimestamp = currentPoint.timestamp + expectedStep
        if (
          suffixZeroTimestamp < nextPoint.timestamp &&
          suffixZeroTimestamp > TEAM_METRICS_BACKEND_COLLECTION_INTERVAL_MS
        ) {
          result.push({
            timestamp: suffixZeroTimestamp,
            concurrentSandboxes: 0,
            sandboxStartRate: 0,
          })
        }

        // fill zero before the next wave (prefix)
        const prefixZeroTimestamp = nextPoint.timestamp - expectedStep
        if (
          prefixZeroTimestamp > currentPoint.timestamp &&
          prefixZeroTimestamp < nextPoint.timestamp
        ) {
          result.push({
            timestamp: prefixZeroTimestamp,
            concurrentSandboxes: 0,
            sandboxStartRate: 0,
          })
        }
      }
    }
  }

  // check if we should add zeros at the end
  const lastDataPoint = sortedData[sortedData.length - 1]!
  const gapToEnd = end - lastDataPoint.timestamp
  const isEndAnomalous = gapToEnd > step * (1 + anomalousGapTolerance)

  // add zeros at end if:
  // 1. there's an anomalous gap AND the gap is larger than backend collection interval
  // 2. OR the gap is more than 3x the step AND larger than backend collection interval (ensures zeros for stale data)
  // 3. OR the gap is more than 5 minutes regardless of step
  const shouldAddEndZeros =
    (isEndAnomalous &&
      gapToEnd > TEAM_METRICS_BACKEND_COLLECTION_INTERVAL_MS) ||
    (step > 0 &&
      gapToEnd >= step * 3 &&
      gapToEnd > TEAM_METRICS_BACKEND_COLLECTION_INTERVAL_MS) ||
    gapToEnd >= 5 * 60 * 1000

  if (shouldAddEndZeros) {
    const suffixZeroTimestamp = lastDataPoint.timestamp + step
    if (suffixZeroTimestamp < end) {
      result.push({
        timestamp: suffixZeroTimestamp,
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      })
    }

    result.push({
      timestamp: end - 1000,
      concurrentSandboxes: 0,
      sandboxStartRate: 0,
    })
  }

  return result.sort((a, b) => a.timestamp - b.timestamp)
}
