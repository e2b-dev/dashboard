import { TEAM_METRICS_POLLING_INTERVAL_MS } from '@/configs/intervals'
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

const ANOMALOUS_GAP_TOLERANCE = 0.3

/**
 * detects anomalies in team metrics data and fills exactly one zero between "waves" of data.
 * calculates step from the first two data points and detects gaps in sequences.
 */
export function fillTeamMetricsWithZeros(
  data: ClientTeamMetrics,
  start: number,
  end: number
): ClientTeamMetrics {
  if (!data.length) {
    return [
      {
        timestamp: start,
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      },
      {
        timestamp: end - 1000,
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      },
    ]
  }

  if (data.length < 2) {
    return data.sort((a, b) => a.timestamp - b.timestamp)
  }

  const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp)
  const dynamicStep = sortedData[1]!.timestamp - sortedData[0]!.timestamp
  const result: ClientTeamMetrics = []

  // check if we should add zeros at the start
  const firstDataPoint = sortedData[0]!
  const gapFromStart = firstDataPoint.timestamp - start
  const isStartAnomalous =
    gapFromStart > dynamicStep * (1 + ANOMALOUS_GAP_TOLERANCE)

  if (isStartAnomalous) {
    result.push({
      timestamp: start,
      concurrentSandboxes: 0,
      sandboxStartRate: 0,
    })

    const prefixZeroTimestamp = firstDataPoint.timestamp - dynamicStep
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
    const expectedStep = dynamicStep

    // allow some tolerance for step variations (±20%)
    const tolerance = expectedStep * ANOMALOUS_GAP_TOLERANCE
    const isAnomalousGap = actualGap > expectedStep + tolerance

    if (isAnomalousGap) {
      const hasSequenceBefore = i >= 1
      const hasDataAfter = i + 1 < sortedData.length

      if (hasSequenceBefore && hasDataAfter) {
        // fill zero after the current wave (suffix)
        const suffixZeroTimestamp = currentPoint.timestamp + expectedStep
        if (suffixZeroTimestamp < nextPoint.timestamp) {
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
  const isEndAnomalous = gapToEnd > dynamicStep * (1 + ANOMALOUS_GAP_TOLERANCE)

  // we can add zeros at the end if the current time is more than the polling interval after the last data point
  const canBeZero = Date.now() - TEAM_METRICS_POLLING_INTERVAL_MS > end

  if (isEndAnomalous && canBeZero) {
    const suffixZeroTimestamp = lastDataPoint.timestamp + dynamicStep
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

// calculate the averaging period for the tooltip
export const getAveragingPeriodText = (stepMs: number) => {
  const seconds = Math.floor(stepMs / 1000)
  if (seconds < 60) {
    return `${seconds} second average`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} minute average`
  } else {
    const hours = Math.floor(seconds / 3600)
    return `${hours} hour average`
  }
}
