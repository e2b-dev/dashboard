import type { SandboxMetric } from '@/server/api/models/sandboxes.models'
import { millisecondsInSecond } from 'date-fns/constants'
import type { MonitoringChartModel } from '../types/sandbox-metrics-chart'
import {
  SANDBOX_MONITORING_CHART_MAX_POINTS,
  SANDBOX_MONITORING_CHART_MIN_STEP_MS,
  SANDBOX_MONITORING_CPU_AREA_COLOR_VAR,
  SANDBOX_MONITORING_CPU_SERIES_ID,
  SANDBOX_MONITORING_CPU_SERIES_LABEL,
  SANDBOX_MONITORING_CPU_LINE_COLOR_VAR,
  SANDBOX_MONITORING_CPU_AREA_TO_COLOR_VAR,
  SANDBOX_MONITORING_DISK_SERIES_ID,
  SANDBOX_MONITORING_DISK_SERIES_LABEL,
  SANDBOX_MONITORING_DISK_LINE_COLOR_VAR,
  SANDBOX_MONITORING_DISK_AREA_COLOR_VAR,
  SANDBOX_MONITORING_DISK_AREA_TO_COLOR_VAR,
  SANDBOX_MONITORING_PERCENT_MAX,
  SANDBOX_MONITORING_RAM_AREA_COLOR_VAR,
  SANDBOX_MONITORING_RAM_SERIES_ID,
  SANDBOX_MONITORING_RAM_SERIES_LABEL,
  SANDBOX_MONITORING_RAM_LINE_COLOR_VAR,
  SANDBOX_MONITORING_RAM_AREA_TO_COLOR_VAR,
} from './constants'
import { calculateStepForRange } from './timeframe'

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(SANDBOX_MONITORING_PERCENT_MAX, value))
}

function toPercent(used: number, total: number): number {
  if (!total || total <= 0) {
    return 0
  }

  return clampPercent((used / total) * 100)
}

function getMetricTimestampMs(metric: SandboxMetric): number {
  return Math.floor(metric.timestampUnix * millisecondsInSecond)
}

function filterSandboxMetricsByTimeRange(
  metrics: SandboxMetric[],
  startMs: number,
  endMs: number
): SandboxMetric[] {
  return metrics.filter((metric) => {
    const timestampMs = getMetricTimestampMs(metric)
    return timestampMs >= startMs && timestampMs <= endMs
  })
}

function sortSandboxMetricsByTime(metrics: SandboxMetric[]): SandboxMetric[] {
  return [...metrics].sort(
    (a, b) => getMetricTimestampMs(a) - getMetricTimestampMs(b)
  )
}

function createSeriesData(
  metrics: SandboxMetric[],
  categories: number[],
  getValue: (metric: SandboxMetric) => number
) {
  const sums = Array<number>(categories.length).fill(0)
  const counts = Array<number>(categories.length).fill(0)
  if (categories.length === 0) {
    return []
  }

  const start = categories[0]!
  const end = categories[categories.length - 1]!
  const step = categories.length > 1 ? categories[1]! - categories[0]! : 1

  for (const metric of metrics) {
    const timestampMs = getMetricTimestampMs(metric)
    if (timestampMs < start || timestampMs > end) {
      continue
    }

    const index = Math.max(
      0,
      Math.min(categories.length - 1, Math.round((timestampMs - start) / step))
    )

    sums[index] = (sums[index] ?? 0) + getValue(metric)
    counts[index] = (counts[index] ?? 0) + 1
  }

  return categories.map((x, idx) => ({
    x,
    y: counts[idx]! > 0 ? sums[idx]! / counts[idx]! : null,
  }))
}

function buildResourceSeries(metrics: SandboxMetric[], categories: number[]) {
  return [
    {
      id: SANDBOX_MONITORING_CPU_SERIES_ID,
      name: SANDBOX_MONITORING_CPU_SERIES_LABEL,
      lineColorVar: SANDBOX_MONITORING_CPU_LINE_COLOR_VAR,
      areaColorVar: SANDBOX_MONITORING_CPU_AREA_COLOR_VAR,
      areaToColorVar: SANDBOX_MONITORING_CPU_AREA_TO_COLOR_VAR,
      data: createSeriesData(metrics, categories, (metric) =>
        clampPercent(metric.cpuUsedPct)
      ),
    },
    {
      id: SANDBOX_MONITORING_RAM_SERIES_ID,
      name: SANDBOX_MONITORING_RAM_SERIES_LABEL,
      lineColorVar: SANDBOX_MONITORING_RAM_LINE_COLOR_VAR,
      areaColorVar: SANDBOX_MONITORING_RAM_AREA_COLOR_VAR,
      areaToColorVar: SANDBOX_MONITORING_RAM_AREA_TO_COLOR_VAR,
      data: createSeriesData(metrics, categories, (metric) =>
        toPercent(metric.memUsed, metric.memTotal)
      ),
    },
  ]
}

function buildDiskSeries(metrics: SandboxMetric[], categories: number[]) {
  return [
    {
      id: SANDBOX_MONITORING_DISK_SERIES_ID,
      name: SANDBOX_MONITORING_DISK_SERIES_LABEL,
      lineColorVar: SANDBOX_MONITORING_DISK_LINE_COLOR_VAR,
      areaColorVar: SANDBOX_MONITORING_DISK_AREA_COLOR_VAR,
      areaToColorVar: SANDBOX_MONITORING_DISK_AREA_TO_COLOR_VAR,
      data: createSeriesData(metrics, categories, (metric) =>
        toPercent(metric.diskUsed, metric.diskTotal)
      ),
    },
  ]
}

interface BuildMonitoringChartModelOptions {
  metrics: SandboxMetric[]
  startMs: number
  endMs: number
  hoveredIndex: number | null
}

export function buildTimelineCategories(startMs: number, endMs: number): number[] {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return []
  }

  const normalizedStart = Math.floor(startMs)
  const normalizedEnd = Math.floor(endMs)
  if (normalizedEnd <= normalizedStart) {
    return [normalizedStart]
  }

  const baseStepMs = Math.max(
    SANDBOX_MONITORING_CHART_MIN_STEP_MS,
    Math.floor(
      calculateStepForRange(normalizedStart, normalizedEnd) /
        millisecondsInSecond
    ) * millisecondsInSecond
  )

  const duration = normalizedEnd - normalizedStart
  const estimatedPoints = Math.floor(duration / baseStepMs) + 1
  const needsCapping = estimatedPoints > SANDBOX_MONITORING_CHART_MAX_POINTS
  const stepMs = needsCapping
    ? Math.max(
        baseStepMs,
        Math.ceil(
          duration / (SANDBOX_MONITORING_CHART_MAX_POINTS - 1) /
            millisecondsInSecond
        ) * millisecondsInSecond
      )
    : baseStepMs

  const categories: number[] = []
  for (let timestamp = normalizedStart; timestamp <= normalizedEnd; timestamp += stepMs) {
    categories.push(timestamp)
  }

  if (categories[categories.length - 1] !== normalizedEnd) {
    categories.push(normalizedEnd)
  }

  return categories
}

export function buildMonitoringChartModel({
  metrics,
  startMs,
  endMs,
  hoveredIndex,
}: BuildMonitoringChartModelOptions): MonitoringChartModel {
  const constrainedMetrics = filterSandboxMetricsByTimeRange(metrics, startMs, endMs)
  const sortedMetrics = sortSandboxMetricsByTime(constrainedMetrics)
  const categories = buildTimelineCategories(startMs, endMs)
  const resourceSeries = buildResourceSeries(sortedMetrics, categories)
  const diskSeries = buildDiskSeries(sortedMetrics, categories)
  const latestMetric = sortedMetrics[sortedMetrics.length - 1]

  if (hoveredIndex === null) {
    return {
      categories,
      latestMetric,
      resourceSeries,
      diskSeries,
      resourceHoveredContext: null,
      diskHoveredContext: null,
    }
  }

  const hoveredTimestamp = categories[hoveredIndex]
  if (hoveredTimestamp === undefined) {
    return {
      categories,
      latestMetric,
      resourceSeries,
      diskSeries,
      resourceHoveredContext: null,
      diskHoveredContext: null,
    }
  }

  const cpuSeries = resourceSeries.find(
    (series) => series.id === SANDBOX_MONITORING_CPU_SERIES_ID
  )
  const ramSeries = resourceSeries.find(
    (series) => series.id === SANDBOX_MONITORING_RAM_SERIES_ID
  )
  const diskSeriesItem = diskSeries.find(
    (series) => series.id === SANDBOX_MONITORING_DISK_SERIES_ID
  )

  return {
    categories,
    latestMetric,
    resourceSeries,
    diskSeries,
    resourceHoveredContext: {
      cpuPercent: cpuSeries?.data[hoveredIndex]?.y ?? null,
      ramPercent: ramSeries?.data[hoveredIndex]?.y ?? null,
      timestampMs: hoveredTimestamp,
    },
    diskHoveredContext: {
      diskPercent: diskSeriesItem?.data[hoveredIndex]?.y ?? null,
      timestampMs: hoveredTimestamp,
    },
  }
}
