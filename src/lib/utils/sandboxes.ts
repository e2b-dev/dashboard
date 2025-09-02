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
export function fillTeamMetricsWithZeros(
  data: ClientTeamMetrics,
  start: number,
  end: number,
  step: number,
  anomalousGapTolerance: number = 0.1
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
  const isEndAnomalous = gapToEnd > step * (1 + anomalousGapTolerance)

  if (isEndAnomalous) {
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
