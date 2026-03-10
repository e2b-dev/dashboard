import type { SandboxMetric } from '@/server/api/models/sandboxes.models'
import type { SandboxEventDTO } from '@/server/api/models/sandboxes.models'
import type { MonitoringChartModel } from '../types/sandbox-metrics-chart'
import {
  applyPauseWindows,
  buildInactiveWindows,
  buildLifecycleEventMarkers,
} from './chart-lifecycle'
import {
  type NormalizedSandboxMetric,
  buildDiskSeries,
  buildResourceSeries,
  findClosestMetric,
  normalizeMetric,
  sortMetricsByTimestamp,
} from './chart-metrics'

interface BuildMonitoringChartModelOptions {
  metrics: SandboxMetric[]
  lifecycleEvents?: SandboxEventDTO[]
  startMs: number
  endMs: number
  hoveredTimestampMs: number | null
}

export function buildMonitoringChartModel({
  metrics,
  lifecycleEvents = [],
  startMs,
  endMs,
  hoveredTimestampMs,
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
  const latestMetric = normalizedMetrics[normalizedMetrics.length - 1]?.metric

  const hoveredMetric =
    hoveredTimestampMs !== null
      ? findClosestMetric(normalizedMetrics, hoveredTimestampMs)
      : null

  return {
    latestMetric,
    resourceSeries,
    diskSeries,
    resourceLifecycleEventMarkers,
    resourceHoveredContext: hoveredMetric
      ? {
          cpuPercent: hoveredMetric.cpuPercent,
          ramPercent: hoveredMetric.ramPercent,
          timestampMs: hoveredMetric.timestampMs,
        }
      : null,
    diskHoveredContext: hoveredMetric
      ? {
          diskPercent: hoveredMetric.diskPercent,
          timestampMs: hoveredMetric.timestampMs,
        }
      : null,
  }
}
