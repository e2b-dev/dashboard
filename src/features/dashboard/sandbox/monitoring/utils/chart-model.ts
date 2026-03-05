import { millisecondsInSecond } from 'date-fns/constants'
import type { SandboxMetric } from '@/server/api/models/sandboxes.models'
import type {
  MonitoringChartModel,
  SandboxMetricsDataPoint,
  SandboxMetricsSeries,
} from '../types/sandbox-metrics-chart'
import {
  SANDBOX_MONITORING_CPU_AREA_COLOR_VAR,
  SANDBOX_MONITORING_CPU_AREA_TO_COLOR_VAR,
  SANDBOX_MONITORING_CPU_LINE_COLOR_VAR,
  SANDBOX_MONITORING_CPU_SERIES_ID,
  SANDBOX_MONITORING_CPU_SERIES_LABEL,
  SANDBOX_MONITORING_DISK_AREA_COLOR_VAR,
  SANDBOX_MONITORING_DISK_AREA_TO_COLOR_VAR,
  SANDBOX_MONITORING_DISK_LINE_COLOR_VAR,
  SANDBOX_MONITORING_DISK_SERIES_ID,
  SANDBOX_MONITORING_DISK_SERIES_LABEL,
  SANDBOX_MONITORING_RAM_AREA_COLOR_VAR,
  SANDBOX_MONITORING_RAM_AREA_TO_COLOR_VAR,
  SANDBOX_MONITORING_RAM_LINE_COLOR_VAR,
  SANDBOX_MONITORING_RAM_SERIES_ID,
  SANDBOX_MONITORING_RAM_SERIES_LABEL,
} from './constants'
import { clampPercent } from './formatters'

interface NormalizedSandboxMetric {
  metric: SandboxMetric
  timestampMs: number
  cpuPercent: number
  ramPercent: number
  diskPercent: number
  ramUsedMb: number
  diskUsedMb: number
}

interface BuildMonitoringChartModelOptions {
  metrics: SandboxMetric[]
  startMs: number
  endMs: number
  hoveredTimestampMs: number | null
}

function toPercent(used: number, total: number): number {
  if (!total || total <= 0) {
    return 0
  }

  return clampPercent((used / total) * 100)
}

function toMegabytes(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0
  }

  return Math.round(value / (1024 * 1024))
}

function getMetricTimestampMs(metric: SandboxMetric): number | null {
  const timestampMs = Math.floor(metric.timestampUnix * millisecondsInSecond)

  if (!Number.isFinite(timestampMs)) {
    return null
  }

  return timestampMs
}

function normalizeMetric(
  metric: SandboxMetric
): NormalizedSandboxMetric | null {
  const timestampMs = getMetricTimestampMs(metric)
  if (timestampMs === null) {
    return null
  }

  return {
    metric,
    timestampMs,
    cpuPercent: clampPercent(metric.cpuUsedPct),
    ramPercent: toPercent(metric.memUsed, metric.memTotal),
    diskPercent: toPercent(metric.diskUsed, metric.diskTotal),
    ramUsedMb: toMegabytes(metric.memUsed),
    diskUsedMb: toMegabytes(metric.diskUsed),
  }
}

function sortMetricsByTimestamp(
  metrics: NormalizedSandboxMetric[]
): NormalizedSandboxMetric[] {
  return [...metrics].sort((a, b) => a.timestampMs - b.timestampMs)
}

function buildSeriesData(
  metrics: NormalizedSandboxMetric[],
  getValue: (metric: NormalizedSandboxMetric) => number,
  getMarkerValue?: (metric: NormalizedSandboxMetric) => number | null
): SandboxMetricsDataPoint[] {
  return metrics.map((metric) => [
    metric.timestampMs,
    getValue(metric),
    getMarkerValue ? getMarkerValue(metric) : null,
  ])
}

function findClosestMetric(
  metrics: NormalizedSandboxMetric[],
  timestampMs: number
): NormalizedSandboxMetric | null {
  if (metrics.length === 0 || !Number.isFinite(timestampMs)) {
    return null
  }

  let low = 0
  let high = metrics.length - 1

  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    const middleTimestamp = metrics[middle]?.timestampMs
    if (middleTimestamp === undefined) {
      break
    }

    if (middleTimestamp === timestampMs) {
      return metrics[middle] ?? null
    }

    if (middleTimestamp < timestampMs) {
      low = middle + 1
    } else {
      high = middle - 1
    }
  }

  const nextMetric = metrics[low]
  const previousMetric = metrics[low - 1]

  if (!nextMetric) {
    return previousMetric ?? null
  }

  if (!previousMetric) {
    return nextMetric
  }

  const nextDistance = Math.abs(nextMetric.timestampMs - timestampMs)
  const previousDistance = Math.abs(previousMetric.timestampMs - timestampMs)

  return previousDistance <= nextDistance ? previousMetric : nextMetric
}

function buildResourceSeries(
  metrics: NormalizedSandboxMetric[]
): SandboxMetricsSeries[] {
  return [
    {
      id: SANDBOX_MONITORING_CPU_SERIES_ID,
      name: SANDBOX_MONITORING_CPU_SERIES_LABEL,
      lineColorVar: SANDBOX_MONITORING_CPU_LINE_COLOR_VAR,
      areaColorVar: SANDBOX_MONITORING_CPU_AREA_COLOR_VAR,
      areaToColorVar: SANDBOX_MONITORING_CPU_AREA_TO_COLOR_VAR,
      showArea: true,
      areaOpacity: 0.3,
      zIndex: 2,
      data: buildSeriesData(metrics, (metric) => metric.cpuPercent),
    },
    {
      id: SANDBOX_MONITORING_RAM_SERIES_ID,
      name: SANDBOX_MONITORING_RAM_SERIES_LABEL,
      lineColorVar: SANDBOX_MONITORING_RAM_LINE_COLOR_VAR,
      areaColorVar: SANDBOX_MONITORING_RAM_AREA_COLOR_VAR,
      areaToColorVar: SANDBOX_MONITORING_RAM_AREA_TO_COLOR_VAR,
      showArea: true,
      areaOpacity: 0.3,
      zIndex: 1,
      data: buildSeriesData(
        metrics,
        (metric) => metric.ramPercent,
        (metric) => metric.ramUsedMb
      ),
    },
  ]
}

function buildDiskSeries(
  metrics: NormalizedSandboxMetric[]
): SandboxMetricsSeries[] {
  return [
    {
      id: SANDBOX_MONITORING_DISK_SERIES_ID,
      name: SANDBOX_MONITORING_DISK_SERIES_LABEL,
      lineColorVar: SANDBOX_MONITORING_DISK_LINE_COLOR_VAR,
      areaColorVar: SANDBOX_MONITORING_DISK_AREA_COLOR_VAR,
      areaToColorVar: SANDBOX_MONITORING_DISK_AREA_TO_COLOR_VAR,
      showArea: true,
      areaOpacity: 0.5,
      data: buildSeriesData(
        metrics,
        (metric) => metric.diskPercent,
        (metric) => metric.diskUsedMb
      ),
    },
  ]
}

export function buildMonitoringChartModel({
  metrics,
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

  const resourceSeries = buildResourceSeries(normalizedMetrics)
  const diskSeries = buildDiskSeries(normalizedMetrics)
  const latestMetric = normalizedMetrics[normalizedMetrics.length - 1]?.metric

  if (hoveredTimestampMs === null) {
    return {
      latestMetric,
      resourceSeries,
      diskSeries,
      resourceHoveredContext: null,
      diskHoveredContext: null,
    }
  }

  const hoveredMetric = findClosestMetric(normalizedMetrics, hoveredTimestampMs)
  if (!hoveredMetric) {
    return {
      latestMetric,
      resourceSeries,
      diskSeries,
      resourceHoveredContext: null,
      diskHoveredContext: null,
    }
  }

  return {
    latestMetric,
    resourceSeries,
    diskSeries,
    resourceHoveredContext: {
      cpuPercent: hoveredMetric.cpuPercent,
      ramPercent: hoveredMetric.ramPercent,
      timestampMs: hoveredMetric.timestampMs,
    },
    diskHoveredContext: {
      diskPercent: hoveredMetric.diskPercent,
      timestampMs: hoveredMetric.timestampMs,
    },
  }
}
