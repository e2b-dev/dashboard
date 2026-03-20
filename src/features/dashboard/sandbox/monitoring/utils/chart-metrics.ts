import { millisecondsInSecond } from 'date-fns/constants'
import type { SandboxMetric } from '@/core/modules/sandboxes/models'
import type {
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
import { calculateRatioPercent, clampPercent } from './formatters'

export interface NormalizedSandboxMetric {
  metric: SandboxMetric
  timestampMs: number
  cpuPercent: number
  ramPercent: number
  diskPercent: number
  ramUsedMb: number
  diskUsedMb: number
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

export function normalizeMetric(
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
    ramPercent: calculateRatioPercent(metric.memUsed, metric.memTotal),
    diskPercent: calculateRatioPercent(metric.diskUsed, metric.diskTotal),
    ramUsedMb: toMegabytes(metric.memUsed),
    diskUsedMb: toMegabytes(metric.diskUsed),
  }
}

export function sortMetricsByTimestamp(
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

export function buildResourceSeries(
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

export function buildDiskSeries(
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
