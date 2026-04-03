import type {
  SandboxEventModel,
  SandboxMetric,
} from '@/core/modules/sandboxes/models'
import type { MonitoringChartModel } from '../types/sandbox-metrics-chart'
import {
  applyPauseWindows,
  buildInactiveWindows,
  buildLifecycleEventMarkers,
} from './chart-lifecycle'
import {
  buildDiskSeries,
  buildResourceSeries,
  type NormalizedSandboxMetric,
  normalizeMetric,
  sortMetricsByTimestamp,
} from './chart-metrics'

interface BuildMonitoringChartModelOptions {
  metrics: SandboxMetric[]
  lifecycleEvents?: SandboxEventModel[]
  startMs: number
  endMs: number
}

export function buildMonitoringChartModel({
  metrics,
  lifecycleEvents = [],
  startMs,
  endMs,
}: BuildMonitoringChartModelOptions): MonitoringChartModel {
  const rangeStart = Math.min(startMs, endMs)
  const rangeEnd = Math.max(startMs, endMs)

  const normalizedMetrics = sortMetricsByTimestamp(
    metrics
      .map(normalizeMetric)
      .filter((metric): metric is NormalizedSandboxMetric => {
        if (!metric) {
          return false
        }

        return (
          metric.timestampMs >= rangeStart && metric.timestampMs <= rangeEnd
        )
      })
  )

  const pauseWindows = buildInactiveWindows(
    lifecycleEvents,
    rangeStart,
    rangeEnd
  )
  const resourceLifecycleEventMarkers = buildLifecycleEventMarkers(
    lifecycleEvents,
    rangeStart,
    rangeEnd
  )
  const resourceSeries = applyPauseWindows(
    buildResourceSeries(normalizedMetrics),
    pauseWindows
  )
  const diskSeries = applyPauseWindows(
    buildDiskSeries(normalizedMetrics),
    pauseWindows
  )
  return {
    resourceSeries,
    diskSeries,
    resourceLifecycleEventMarkers,
  }
}
