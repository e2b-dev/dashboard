import type { SandboxMetric } from '@/server/api/models/sandboxes.models'
import { millisecondsInSecond } from 'date-fns/constants'
import {
  SANDBOX_MONITORING_CHART_MIN_STEP_MS,
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
  SANDBOX_MONITORING_PERCENT_MAX,
  SANDBOX_MONITORING_RAM_AREA_COLOR_VAR,
  SANDBOX_MONITORING_RAM_AREA_TO_COLOR_VAR,
  SANDBOX_MONITORING_RAM_LINE_COLOR_VAR,
  SANDBOX_MONITORING_RAM_SERIES_ID,
  SANDBOX_MONITORING_RAM_SERIES_LABEL,
} from './constants'
import type { SandboxMetricsSeries } from '../types/sandbox-metrics-chart'
import { calculateStepForRange } from './timeframe'

function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(SANDBOX_MONITORING_PERCENT_MAX, value))
}

function getMetricTimestampMs(metric: SandboxMetric): number {
  if (typeof metric.timestampUnix === 'number') {
    return metric.timestampUnix * millisecondsInSecond
  }

  return new Date(metric.timestamp).getTime()
}

export function filterSandboxMetricsByTimeRange(
  metrics: SandboxMetric[],
  startMs: number,
  endMs: number
): SandboxMetric[] {
  return metrics.filter((metric) => {
    const timestampMs = getMetricTimestampMs(metric)
    return timestampMs >= startMs && timestampMs <= endMs
  })
}

export function buildTimelineCategories(
  startMs: number,
  endMs: number
): number[] {
  const normalizedStart = Math.floor(startMs)
  const normalizedEnd = Math.floor(endMs)

  if (normalizedEnd <= normalizedStart) {
    return [normalizedStart]
  }

  const stepMs = Math.max(
    SANDBOX_MONITORING_CHART_MIN_STEP_MS,
    Math.floor(
      calculateStepForRange(normalizedStart, normalizedEnd) /
        millisecondsInSecond
    ) * millisecondsInSecond
  )

  const categories: number[] = []

  for (let ts = normalizedStart; ts <= normalizedEnd; ts += stepMs) {
    categories.push(ts)
  }

  if (categories[categories.length - 1] !== normalizedEnd) {
    categories.push(normalizedEnd)
  }

  return categories
}

function toPercent(used: number, total: number): number {
  if (!total || total <= 0) return 0
  return clampPercent((used / total) * 100)
}

export function sortSandboxMetricsByTime(
  metrics: SandboxMetric[]
): SandboxMetric[] {
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
    const ts = getMetricTimestampMs(metric)

    if (ts < start || ts > end) {
      continue
    }

    const index = Math.max(
      0,
      Math.min(categories.length - 1, Math.round((ts - start) / step))
    )

    sums[index] = (sums[index] ?? 0) + getValue(metric)
    counts[index] = (counts[index] ?? 0) + 1
  }

  return categories.map((x, idx) => ({
    x,
    y: counts[idx]! > 0 ? sums[idx]! / counts[idx]! : null,
  }))
}

export function buildResourceSeries(
  metrics: SandboxMetric[],
  categories: number[]
): SandboxMetricsSeries[] {
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

export function buildDiskSeries(
  metrics: SandboxMetric[],
  categories: number[]
): SandboxMetricsSeries[] {
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
