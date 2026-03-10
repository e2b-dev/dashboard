import { millisecondsInSecond } from 'date-fns/constants'
import type {
  SandboxEventDTO,
  SandboxMetric,
} from '@/server/api/models/sandboxes.models'
import type {
  MonitoringChartModel,
  SandboxMetricsDataPoint,
  SandboxMetricsLifecycleEventMarker,
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
  SANDBOX_LIFECYCLE_EVENT_CREATED,
  SANDBOX_LIFECYCLE_EVENT_PAUSED,
  SANDBOX_LIFECYCLE_EVENT_RESUMED,
  SANDBOX_LIFECYCLE_EVENT_KILLED,
} from './constants'
import { calculateRatioPercent, clampPercent } from './formatters'
import { parseDateTimestampMs } from './timeframe'

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
  lifecycleEvents?: SandboxEventDTO[]
  startMs: number
  endMs: number
  hoveredTimestampMs: number | null
}

interface LifecyclePauseWindow {
  startMs: number
  endMs: number
}

const EVENT_DEFAULT_COLOR_VAR = '--fg-tertiary'

const VISIBLE_EVENT_TYPES = new Set([
  SANDBOX_LIFECYCLE_EVENT_CREATED,
  SANDBOX_LIFECYCLE_EVENT_PAUSED,
  SANDBOX_LIFECYCLE_EVENT_RESUMED,
  SANDBOX_LIFECYCLE_EVENT_KILLED,
])

const EVENT_STYLES: Record<string, { label: string; colorVar: string }> = {
  [SANDBOX_LIFECYCLE_EVENT_CREATED]: {
    label: 'Created',
    colorVar: '--accent-positive-highlight',
  },
  [SANDBOX_LIFECYCLE_EVENT_PAUSED]: {
    label: 'Paused',
    colorVar: '--accent-info-highlight',
  },
  [SANDBOX_LIFECYCLE_EVENT_RESUMED]: {
    label: 'Resumed',
    colorVar: '--accent-info-highlight',
  },
  [SANDBOX_LIFECYCLE_EVENT_KILLED]: {
    label: 'Killed',
    colorVar: '--accent-error-highlight',
  },
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
    ramPercent: calculateRatioPercent(metric.memUsed, metric.memTotal),
    diskPercent: calculateRatioPercent(metric.diskUsed, metric.diskTotal),
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

function sortLifecycleEventsByTimestamp(
  events: SandboxEventDTO[]
): SandboxEventDTO[] {
  return [...events].sort((a, b) => {
    const timestampA =
      parseDateTimestampMs(a.timestamp) ?? Number.MAX_SAFE_INTEGER
    const timestampB =
      parseDateTimestampMs(b.timestamp) ?? Number.MAX_SAFE_INTEGER

    if (timestampA !== timestampB) {
      return timestampA - timestampB
    }

    return a.id.localeCompare(b.id)
  })
}

function formatLifecycleEventTypeLabel(type: string): string {
  const suffix = type.split('.').pop() ?? type
  const normalized = suffix.replace(/[-_]+/g, ' ').trim()

  if (!normalized) {
    return 'Event'
  }

  return normalized
    .split(' ')
    .map((word) => {
      if (!word) {
        return word
      }

      return `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`
    })
    .join(' ')
}

function toVisiblePauseWindow(
  startMs: number,
  endMs: number,
  rangeStart: number,
  rangeEnd: number
): LifecyclePauseWindow | null {
  const visibleStartMs = Math.max(startMs, rangeStart)
  const visibleEndMs = Math.min(endMs, rangeEnd)

  if (!Number.isFinite(visibleStartMs) || !Number.isFinite(visibleEndMs)) {
    return null
  }

  if (visibleEndMs <= visibleStartMs) {
    return null
  }

  return {
    startMs: visibleStartMs,
    endMs: visibleEndMs,
  }
}

function buildInactiveWindows(
  lifecycleEvents: SandboxEventDTO[],
  rangeStart: number,
  rangeEnd: number
): LifecyclePauseWindow[] {
  const windows: LifecyclePauseWindow[] = []
  const sortedEvents = sortLifecycleEventsByTimestamp(lifecycleEvents)

  let createdMs: number | null = null
  let killedMs: number | null = null
  let activePauseStartMs: number | null = null

  for (const event of sortedEvents) {
    const eventTimestampMs = parseDateTimestampMs(event.timestamp)
    if (eventTimestampMs === null) {
      continue
    }

    if (event.type === SANDBOX_LIFECYCLE_EVENT_CREATED && createdMs === null) {
      createdMs = eventTimestampMs
      continue
    }

    if (event.type === SANDBOX_LIFECYCLE_EVENT_PAUSED) {
      activePauseStartMs = eventTimestampMs
      continue
    }

    if (
      event.type === SANDBOX_LIFECYCLE_EVENT_RESUMED &&
      activePauseStartMs !== null
    ) {
      if (eventTimestampMs > activePauseStartMs) {
        const visibleWindow = toVisiblePauseWindow(
          activePauseStartMs,
          eventTimestampMs,
          rangeStart,
          rangeEnd
        )

        if (visibleWindow) {
          windows.push(visibleWindow)
        }
      }

      activePauseStartMs = null
      continue
    }

    if (event.type === SANDBOX_LIFECYCLE_EVENT_KILLED) {
      killedMs = eventTimestampMs
    }
  }

  // Before created: no data should exist
  if (createdMs !== null && createdMs >= rangeStart) {
    if (createdMs > rangeStart) {
      const visibleWindow = toVisiblePauseWindow(
        rangeStart,
        createdMs,
        rangeStart,
        rangeEnd
      )
      if (visibleWindow) {
        windows.unshift(visibleWindow)
      }
    } else {
      // createdMs === rangeStart: zero-width window as a connector reference
      // point so buildPauseWindowConnectors bridges to the first data point
      windows.unshift({ startMs: createdMs, endMs: createdMs })
    }
  }

  // Open pause (sandbox currently paused, no resume yet)
  if (activePauseStartMs !== null) {
    const pauseEndMs = killedMs ?? rangeEnd
    if (pauseEndMs > activePauseStartMs) {
      const visibleWindow = toVisiblePauseWindow(
        activePauseStartMs,
        pauseEndMs,
        rangeStart,
        rangeEnd
      )
      if (visibleWindow) {
        windows.push(visibleWindow)
      }
    }
  }

  // After killed: no data should exist
  if (killedMs !== null && killedMs <= rangeEnd) {
    if (killedMs < rangeEnd) {
      const visibleWindow = toVisiblePauseWindow(
        killedMs,
        rangeEnd,
        rangeStart,
        rangeEnd
      )
      if (visibleWindow) {
        windows.push(visibleWindow)
      }
    } else {
      // killedMs === rangeEnd: zero-width window as a connector reference
      // point so buildPauseWindowConnectors bridges from the last data point
      windows.push({ startMs: killedMs, endMs: killedMs })
    }
  }

  return windows
}

function buildLifecycleEventMarkers(
  lifecycleEvents: SandboxEventDTO[],
  rangeStart: number,
  rangeEnd: number
): SandboxMetricsLifecycleEventMarker[] {
  const markers: SandboxMetricsLifecycleEventMarker[] = []

  for (const event of sortLifecycleEventsByTimestamp(lifecycleEvents)) {
    const timestampMs = parseDateTimestampMs(event.timestamp)
    if (timestampMs === null) {
      continue
    }

    if (timestampMs < rangeStart || timestampMs > rangeEnd) {
      continue
    }

    if (!VISIBLE_EVENT_TYPES.has(event.type)) {
      continue
    }

    const eventStyle = EVENT_STYLES[event.type]

    markers.push({
      id: event.id,
      type: event.type,
      label: eventStyle?.label ?? formatLifecycleEventTypeLabel(event.type),
      timestampMs,
      colorVar:
        eventStyle?.colorVar ?? EVENT_DEFAULT_COLOR_VAR,
    })
  }

  return markers
}

function hasValidDataBeforeTimestamp(
  data: SandboxMetricsDataPoint[],
  timestampMs: number
): boolean {
  return data.some((point) => point[1] !== null && point[0] < timestampMs)
}

function hasValidDataAfterTimestamp(
  data: SandboxMetricsDataPoint[],
  timestampMs: number
): boolean {
  return data.some((point) => point[1] !== null && point[0] > timestampMs)
}

function findLastValidPointBeforeTimestamp(
  data: SandboxMetricsDataPoint[],
  timestampMs: number
): SandboxMetricsDataPoint | null {
  for (let index = data.length - 1; index >= 0; index -= 1) {
    const point = data[index]
    if (!point) {
      continue
    }

    const [pointTimestampMs, pointValue] = point
    if (pointValue === null || !Number.isFinite(pointTimestampMs)) {
      continue
    }

    if (pointTimestampMs < timestampMs) {
      return point
    }
  }

  return null
}

function findFirstValidPointAfterTimestamp(
  data: SandboxMetricsDataPoint[],
  timestampMs: number
): SandboxMetricsDataPoint | null {
  for (const point of data) {
    if (!point) {
      continue
    }

    const [pointTimestampMs, pointValue] = point
    if (pointValue === null || !Number.isFinite(pointTimestampMs)) {
      continue
    }

    if (pointTimestampMs > timestampMs) {
      return point
    }
  }

  return null
}

function buildPauseWindowConnectors(
  data: SandboxMetricsDataPoint[],
  pauseWindows: LifecyclePauseWindow[]
) {
  const connectors: NonNullable<SandboxMetricsSeries['connectors']> = []

  for (const pauseWindow of pauseWindows) {
    const previousPoint = findLastValidPointBeforeTimestamp(
      data,
      pauseWindow.startMs
    )
    if (previousPoint && previousPoint[1] !== null) {
      connectors.push({
        from: [previousPoint[0], previousPoint[1]],
        to: [pauseWindow.startMs, previousPoint[1]],
      })
    }

    const nextPoint = findFirstValidPointAfterTimestamp(data, pauseWindow.endMs)
    if (nextPoint && nextPoint[1] !== null) {
      connectors.push({
        from: [pauseWindow.endMs, nextPoint[1]],
        to: [nextPoint[0], nextPoint[1]],
      })
    }
  }

  return connectors
}

function injectGapNullPoints(
  data: SandboxMetricsDataPoint[],
  inactiveWindows: LifecyclePauseWindow[]
): SandboxMetricsDataPoint[] {
  if (data.length === 0 || inactiveWindows.length === 0) {
    return data
  }

  // Null out any data points that fall inside an inactive window.
  const dataWithGaps: SandboxMetricsDataPoint[] = data.map((point) => {
    const [timestampMs, value] = point
    if (value === null) {
      return point
    }

    const isInactive = inactiveWindows.some(
      (window) => timestampMs >= window.startMs && timestampMs <= window.endMs
    )

    return isInactive ? [timestampMs, null, null] : point
  })

  // Insert mid-gap null points for windows that have data on both sides,
  // ensuring ECharts breaks the line even when no actual data point falls
  // inside the window.
  for (const window of inactiveWindows) {
    const hasDataOnBothSides =
      hasValidDataBeforeTimestamp(dataWithGaps, window.startMs) &&
      hasValidDataAfterTimestamp(dataWithGaps, window.endMs)

    if (hasDataOnBothSides) {
      const gapTimestampMs = Math.floor((window.startMs + window.endMs) / 2)
      dataWithGaps.push([gapTimestampMs, null, null])
    }
  }

  return dataWithGaps.sort((a, b) => a[0] - b[0])
}

function applyPauseWindows(
  series: SandboxMetricsSeries[],
  pauseWindows: LifecyclePauseWindow[]
): SandboxMetricsSeries[] {
  if (pauseWindows.length === 0) {
    return series
  }

  return series.map((line) => ({
    ...line,
    connectors: buildPauseWindowConnectors(line.data, pauseWindows),
    data: injectGapNullPoints(line.data, pauseWindows),
  }))
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
