import type { SandboxEventDTO } from '@/server/api/models/sandboxes.models'
import type {
  SandboxMetricsDataPoint,
  SandboxMetricsLifecycleEventMarker,
  SandboxMetricsSeries,
} from '../types/sandbox-metrics-chart'
import {
  SANDBOX_LIFECYCLE_EVENT_CREATED,
  SANDBOX_LIFECYCLE_EVENT_KILLED,
  SANDBOX_LIFECYCLE_EVENT_PAUSED,
  SANDBOX_LIFECYCLE_EVENT_RESUMED,
} from './constants'
import { parseDateTimestampMs } from './timeframe'

export interface LifecyclePauseWindow {
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

export function buildInactiveWindows(
  lifecycleEvents: SandboxEventDTO[],
  rangeStart: number,
  rangeEnd: number
): LifecyclePauseWindow[] {
  const windows: LifecyclePauseWindow[] = []
  const sortedEvents = sortLifecycleEventsByTimestamp(lifecycleEvents)

  let createdMs: number | null = null
  let inactiveStartMs: number | null = null

  for (const event of sortedEvents) {
    const eventTimestampMs = parseDateTimestampMs(event.timestamp)
    if (eventTimestampMs === null) {
      continue
    }

    if (event.type === SANDBOX_LIFECYCLE_EVENT_CREATED && createdMs === null) {
      createdMs = eventTimestampMs
      continue
    }

    if (
      event.type === SANDBOX_LIFECYCLE_EVENT_PAUSED ||
      event.type === SANDBOX_LIFECYCLE_EVENT_KILLED
    ) {
      if (inactiveStartMs === null) {
        inactiveStartMs = eventTimestampMs
      }
      continue
    }

    if (
      event.type === SANDBOX_LIFECYCLE_EVENT_RESUMED &&
      inactiveStartMs !== null
    ) {
      if (eventTimestampMs > inactiveStartMs) {
        const visibleWindow = toVisiblePauseWindow(
          inactiveStartMs,
          eventTimestampMs,
          rangeStart,
          rangeEnd
        )

        if (visibleWindow) {
          windows.push(visibleWindow)
        }
      }

      inactiveStartMs = null
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

  // Open inactive span (sandbox currently paused or killed, no resume yet).
  if (inactiveStartMs !== null) {
    if (rangeEnd > inactiveStartMs) {
      const visibleWindow = toVisiblePauseWindow(
        inactiveStartMs,
        rangeEnd,
        rangeStart,
        rangeEnd
      )
      if (visibleWindow) {
        windows.push(visibleWindow)
      }
    }
  }

  return windows
}

export function buildLifecycleEventMarkers(
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
      colorVar: eventStyle?.colorVar ?? EVENT_DEFAULT_COLOR_VAR,
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

      const nextPoint = findFirstValidPointAfterTimestamp(
        data,
        pauseWindow.endMs
      )
      if (nextPoint && nextPoint[1] !== null) {
        connectors.push({
          from: [pauseWindow.endMs, nextPoint[1]],
          to: [nextPoint[0], nextPoint[1]],
        })
      }
    }
  }

  return connectors
}

function hasValidDataWithinWindow(
  data: SandboxMetricsDataPoint[],
  startMs: number,
  endMs: number
): boolean {
  return data.some(
    (point) => point[1] !== null && point[0] >= startMs && point[0] <= endMs
  )
}

function buildSyntheticActiveWindowConnectors(
  data: SandboxMetricsDataPoint[],
  lifecycleEvents: SandboxEventDTO[],
  rangeStart: number,
  rangeEnd: number
) {
  const connectors: NonNullable<SandboxMetricsSeries['connectors']> = []
  let activeStartMs: number | null = null

  for (const event of sortLifecycleEventsByTimestamp(lifecycleEvents)) {
    const eventTimestampMs = parseDateTimestampMs(event.timestamp)
    if (eventTimestampMs === null) {
      continue
    }

    if (
      event.type === SANDBOX_LIFECYCLE_EVENT_CREATED ||
      event.type === SANDBOX_LIFECYCLE_EVENT_RESUMED
    ) {
      activeStartMs = eventTimestampMs
      continue
    }

    if (
      activeStartMs !== null &&
      (event.type === SANDBOX_LIFECYCLE_EVENT_PAUSED ||
        event.type === SANDBOX_LIFECYCLE_EVENT_KILLED)
    ) {
      const visibleStartMs = Math.max(activeStartMs, rangeStart)
      const visibleEndMs = Math.min(eventTimestampMs, rangeEnd)

      if (
        visibleEndMs > visibleStartMs &&
        !hasValidDataWithinWindow(data, visibleStartMs, visibleEndMs)
      ) {
        connectors.push({
          from: [visibleStartMs, 0],
          to: [visibleEndMs, 0],
          isSynthetic: true,
        })
      }

      activeStartMs = null
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

export function applyPauseWindows(
  series: SandboxMetricsSeries[],
  pauseWindows: LifecyclePauseWindow[],
  lifecycleEvents: SandboxEventDTO[],
  rangeStart: number,
  rangeEnd: number
): SandboxMetricsSeries[] {
  if (pauseWindows.length === 0 && lifecycleEvents.length === 0) {
    return series
  }

  return series.map((line) => ({
    ...line,
    connectors: [
      ...buildPauseWindowConnectors(line.data, pauseWindows),
      ...buildSyntheticActiveWindowConnectors(
        line.data,
        lifecycleEvents,
        rangeStart,
        rangeEnd
      ),
    ],
    data: injectGapNullPoints(line.data, pauseWindows),
  }))
}
