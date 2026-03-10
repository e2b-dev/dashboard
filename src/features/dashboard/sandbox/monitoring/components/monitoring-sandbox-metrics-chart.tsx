'use client'

import type {
  EChartsOption,
  MarkPointComponentOption,
  SeriesOption,
} from 'echarts'
import { LineChart } from 'echarts/charts'
import {
  AxisPointerComponent,
  BrushComponent,
  GridComponent,
  MarkPointComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import { Pause, Play, Plus, Square } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  SANDBOX_MONITORING_CHART_AREA_OPACITY,
  SANDBOX_MONITORING_CHART_AXIS_LABEL_FONT_SIZE,
  SANDBOX_MONITORING_CHART_BRUSH_MODE,
  SANDBOX_MONITORING_CHART_BRUSH_TYPE,
  SANDBOX_MONITORING_CHART_CONNECTOR_LINE_OPACITY,
  SANDBOX_MONITORING_CHART_EVENT_ICON_SIZE,
  SANDBOX_MONITORING_CHART_EVENT_LABEL_OVERLAP_GAP_PX,
  SANDBOX_MONITORING_CHART_EVENT_LABEL_STAGGER_STEP_PX,
  SANDBOX_MONITORING_CHART_EVENT_LABEL_TOP_PX,
  SANDBOX_MONITORING_CHART_EVENT_LINE_BASE_OPACITY,
  SANDBOX_MONITORING_CHART_FALLBACK_FG_TERTIARY,
  SANDBOX_MONITORING_CHART_FALLBACK_FONT_MONO,
  SANDBOX_MONITORING_CHART_FALLBACK_STROKE,
  SANDBOX_MONITORING_CHART_FG_TERTIARY_VAR,
  SANDBOX_MONITORING_CHART_FG_VAR,
  SANDBOX_MONITORING_CHART_FONT_MONO_VAR,
  SANDBOX_MONITORING_CHART_GROUP,
  SANDBOX_MONITORING_CHART_LINE_WIDTH,
  SANDBOX_MONITORING_CHART_LIVE_INNER_DOT_SIZE,
  SANDBOX_MONITORING_CHART_LIVE_MIDDLE_DOT_SIZE,
  SANDBOX_MONITORING_CHART_LIVE_OUTER_DOT_SIZE,
  SANDBOX_MONITORING_CHART_LIVE_WINDOW_MS,
  SANDBOX_MONITORING_CHART_MARKER_BG_OPACITY,
  SANDBOX_MONITORING_CHART_MARKER_BORDER_OPACITY,
  SANDBOX_MONITORING_CHART_MARKER_LABEL_VERTICAL_GAP_PX,
  SANDBOX_MONITORING_CHART_MARKER_OVERLAP_THRESHOLD_PX,
  SANDBOX_MONITORING_CHART_MARKER_RIGHT_THRESHOLD_PX,
  SANDBOX_MONITORING_CHART_OUT_OF_BRUSH_ALPHA,
  SANDBOX_MONITORING_CHART_STROKE_VAR,
  SANDBOX_MONITORING_CHART_Y_AXIS_SCALE_FACTOR,
} from '@/features/dashboard/sandbox/monitoring/utils/constants'
import { useCssVars } from '@/lib/hooks/use-css-vars'
import { cn } from '@/lib/utils'
import { calculateAxisMax } from '@/lib/utils/chart'
import { formatAxisNumber } from '@/lib/utils/formatting'
import type {
  SandboxMetricsChartProps,
  SandboxMetricsDataPoint,
} from '../types/sandbox-metrics-chart'

echarts.use([
  LineChart,
  GridComponent,
  BrushComponent,
  MarkPointComponent,
  SVGRenderer,
  AxisPointerComponent,
])

interface AxisPointerInfo {
  value?: unknown
}

interface UpdateAxisPointerEventParams {
  axesInfo?: AxisPointerInfo[]
  xAxisInfo?: AxisPointerInfo[]
  value?: unknown
}

interface BrushArea {
  coordRange?: [unknown, unknown] | unknown[]
}

interface BrushEndEventParams {
  areas?: BrushArea[]
}

interface CrosshairMarker {
  key: string
  xPx: number
  yPx: number
  valueContent: ReactNode
  dotColor: string
  placeValueOnRight: boolean
  labelOffsetYPx: number
}

interface LifecycleEventOverlay {
  key: string
  type: string
  xPx: number
  topPx: number
  heightPx: number
  label: string
  timestampMs: number
  labelXPx: number
  labelTopPx: number
  color: string
  alignRight: boolean
}

interface LifecycleEventOverlayLayout {
  key: string
  type: string
  xPx: number
  anchorTopPx: number
  bottomPx: number
  label: string
  timestampMs: number
  labelXPx: number
  baseLabelTopPx: number
  labelTopPx: number
  estimatedLabelWidthPx: number
  color: string
  alignRight: boolean
}

const SANDBOX_LIFECYCLE_EVENT_ICON_MAP: Record<string, typeof Plus> = {
  'sandbox.lifecycle.created': Plus,
  'sandbox.lifecycle.paused': Pause,
  'sandbox.lifecycle.resumed': Play,
  'sandbox.lifecycle.killed': Square,
}

function formatEventTimestamp(timestampMs: number): string {
  const date = new Date(timestampMs)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')

  return `${hours}:${minutes}:${seconds}`
}

function withOpacity(color: string, opacity: number): string {
  const normalizedOpacity = Math.max(0, Math.min(1, opacity))
  const hex = color.trim()

  if (!hex.startsWith('#')) {
    return color
  }

  const value = hex.slice(1)
  const expanded =
    value.length === 3
      ? value
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : value

  if (expanded.length !== 6 && expanded.length !== 8) {
    return color
  }

  const r = Number.parseInt(expanded.slice(0, 2), 16)
  const g = Number.parseInt(expanded.slice(2, 4), 16)
  const b = Number.parseInt(expanded.slice(4, 6), 16)

  if ([r, g, b].some((value) => Number.isNaN(value))) {
    return color
  }

  return `rgba(${r}, ${g}, ${b}, ${normalizedOpacity})`
}

function normalizeOpacity(
  opacity: number | undefined,
  fallback: number
): number {
  if (opacity === undefined || !Number.isFinite(opacity)) {
    return fallback
  }

  return Math.max(0, Math.min(1, opacity))
}

function toNumericValue(value: unknown): number {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    return Number(value)
  }

  return Number.NaN
}

function formatXAxisLabel(
  value: number | string,
  includeSeconds: boolean = false
): string {
  const timestamp = Number(value)
  if (Number.isNaN(timestamp)) {
    return ''
  }

  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const base = `${hours}:${minutes}`

  if (!includeSeconds) {
    return base
  }

  const seconds = date.getSeconds().toString().padStart(2, '0')

  return `${base}:${seconds}`
}

function findLivePoint(
  data: SandboxMetricsDataPoint[],
  now: number = Date.now()
): { x: number; y: number } | null {
  const liveBoundary = now - SANDBOX_MONITORING_CHART_LIVE_WINDOW_MS

  for (let index = data.length - 1; index >= 0; index -= 1) {
    const point = data[index]
    if (!point) {
      continue
    }

    const [timestamp, value] = point
    if (typeof value !== 'number' || !Number.isFinite(timestamp)) {
      continue
    }

    if (timestamp > now) {
      continue
    }

    if (timestamp < liveBoundary) {
      return null
    }

    return {
      x: timestamp,
      y: value,
    }
  }

  return null
}

function findClosestValidPoint(
  points: SandboxMetricsDataPoint[],
  targetTimestampMs: number
): { timestampMs: number; value: number; markerValue: number | null } | null {
  let closestPoint: {
    timestampMs: number
    value: number
    markerValue: number | null
  } | null = null
  let closestDistance = Number.POSITIVE_INFINITY

  for (const point of points) {
    if (!point) {
      continue
    }

    const [timestampMs, value, markerValue] = point
    if (value === null || !Number.isFinite(timestampMs)) {
      continue
    }

    const distance = Math.abs(timestampMs - targetTimestampMs)
    if (distance >= closestDistance) {
      continue
    }

    closestDistance = distance
    closestPoint = {
      timestampMs,
      value,
      markerValue: markerValue ?? null,
    }
  }

  return closestPoint
}

function findFirstValidPointTimestampMs(
  points: SandboxMetricsDataPoint[]
): number | null {
  for (const point of points) {
    if (!point) {
      continue
    }

    const [timestampMs, value] = point
    if (value === null || !Number.isFinite(timestampMs)) {
      continue
    }

    return timestampMs
  }

  return null
}

function splitLineDataIntoRenderableSegments(
  data: SandboxMetricsDataPoint[]
): SandboxMetricsDataPoint[][] {
  const segments: SandboxMetricsDataPoint[][] = []
  let currentSegment: SandboxMetricsDataPoint[] = []

  for (const point of data) {
    if (!point) {
      continue
    }

    const [timestampMs, value] = point
    const isRenderablePoint = value !== null && Number.isFinite(timestampMs)

    if (!isRenderablePoint) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment)
        currentSegment = []
      }
      continue
    }

    currentSegment.push(point)
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment)
  }

  return segments
}

function segmentContainsPoint(
  segment: SandboxMetricsDataPoint[],
  point: { x: number; y: number }
): boolean {
  return segment.some(([timestampMs, value]) => {
    if (!Number.isFinite(timestampMs) || value === null) {
      return false
    }

    return timestampMs === point.x && value === point.y
  })
}

function applyMarkerLabelOffsets(
  markers: CrosshairMarker[]
): CrosshairMarker[] {
  if (markers.length < 2) {
    return markers
  }

  const sortedMarkers = [...markers].sort((a, b) => a.yPx - b.yPx)
  const offsetsByMarkerKey = new Map<string, number>()
  let clusterStart = 0

  for (let index = 1; index <= sortedMarkers.length; index += 1) {
    const previousMarker = sortedMarkers[index - 1]
    const currentMarker = sortedMarkers[index]
    if (!previousMarker) {
      continue
    }

    const shouldSplitCluster =
      !currentMarker ||
      Math.abs(currentMarker.yPx - previousMarker.yPx) >
        SANDBOX_MONITORING_CHART_MARKER_OVERLAP_THRESHOLD_PX

    if (!shouldSplitCluster) {
      continue
    }

    const cluster = sortedMarkers.slice(clusterStart, index)
    const halfIndex = (cluster.length - 1) / 2

    cluster.forEach((marker, clusterIndex) => {
      const offset =
        (clusterIndex - halfIndex) *
        SANDBOX_MONITORING_CHART_MARKER_LABEL_VERTICAL_GAP_PX
      offsetsByMarkerKey.set(marker.key, offset)
    })

    clusterStart = index
  }

  return markers.map((marker) => ({
    ...marker,
    labelOffsetYPx: offsetsByMarkerKey.get(marker.key) ?? marker.labelOffsetYPx,
  }))
}

function estimateLifecycleEventLabelWidthPx(): number {
  // Collapsed state is icon-only: icon size + padding (p-1 = 4px each side) + border (1px each side)
  return SANDBOX_MONITORING_CHART_EVENT_ICON_SIZE + 8 + 2
}

function doLifecycleEventLabelsOverlap(
  left: LifecycleEventOverlayLayout,
  right: LifecycleEventOverlayLayout
): boolean {
  const minDistance =
    (left.estimatedLabelWidthPx + right.estimatedLabelWidthPx) / 2 +
    SANDBOX_MONITORING_CHART_EVENT_LABEL_OVERLAP_GAP_PX

  return right.labelXPx - left.labelXPx < minDistance
}

function applyLifecycleEventLabelOffsets(
  overlays: LifecycleEventOverlayLayout[]
): LifecycleEventOverlayLayout[] {
  if (overlays.length < 2) {
    return overlays
  }

  const sortedOverlays = [...overlays].sort((a, b) => a.labelXPx - b.labelXPx)
  const labelTopByOverlayKey = new Map<string, number>()
  let clusterStart = 0

  for (let index = 1; index <= sortedOverlays.length; index += 1) {
    const previousOverlay = sortedOverlays[index - 1]
    const currentOverlay = sortedOverlays[index]
    if (!previousOverlay) {
      continue
    }

    const shouldSplitCluster =
      !currentOverlay ||
      !doLifecycleEventLabelsOverlap(previousOverlay, currentOverlay)

    if (!shouldSplitCluster) {
      continue
    }

    const cluster = sortedOverlays.slice(clusterStart, index)
    cluster.forEach((overlay, clusterIndex) => {
      const verticalOffsetPx =
        -clusterIndex * SANDBOX_MONITORING_CHART_EVENT_LABEL_STAGGER_STEP_PX
      const nextLabelTopPx = Math.max(
        SANDBOX_MONITORING_CHART_EVENT_LABEL_TOP_PX,
        overlay.baseLabelTopPx + verticalOffsetPx
      )

      labelTopByOverlayKey.set(overlay.key, nextLabelTopPx)
    })

    clusterStart = index
  }

  return overlays.map((overlay) => ({
    ...overlay,
    labelTopPx: labelTopByOverlayKey.get(overlay.key) ?? overlay.labelTopPx,
  }))
}

function createLiveIndicators(
  point: { x: number; y: number },
  lineColor: string
) {
  return {
    silent: true,
    animation: false,
    data: [
      {
        coord: [point.x, point.y],
        symbol: 'circle',
        symbolSize: SANDBOX_MONITORING_CHART_LIVE_OUTER_DOT_SIZE,
        itemStyle: {
          color: 'transparent',
          borderColor: lineColor,
          borderWidth: 1,
          shadowBlur: 8,
          shadowColor: lineColor,
          opacity: 0.4,
        },
        emphasis: { disabled: true },
        label: { show: false },
      },
      {
        coord: [point.x, point.y],
        symbol: 'circle',
        symbolSize: SANDBOX_MONITORING_CHART_LIVE_MIDDLE_DOT_SIZE,
        itemStyle: {
          color: lineColor,
          opacity: 0.3,
          borderWidth: 0,
        },
        emphasis: { disabled: true },
        label: { show: false },
      },
      {
        coord: [point.x, point.y],
        symbol: 'circle',
        symbolSize: SANDBOX_MONITORING_CHART_LIVE_INNER_DOT_SIZE,
        itemStyle: {
          color: lineColor,
          borderWidth: 0,
          shadowBlur: 4,
          shadowColor: lineColor,
        },
        emphasis: { disabled: true },
        label: { show: false },
      },
    ],
  }
}

function SandboxMetricsChart({
  series,
  lifecycleEventMarkers = [],
  showEventLabels = true,
  isLiveUpdating = false,
  hoveredTimestampMs = null,
  className,
  showXAxisLabels = true,
  grid,
  xAxisMin,
  xAxisMax,
  yAxisMax,
  yAxisFormatter = formatAxisNumber,
  onHover,
  onHoverEnd,
  onBrushEnd,
}: SandboxMetricsChartProps) {
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const [chartRevision, setChartRevision] = useState(0)
  const { resolvedTheme } = useTheme()

  const computedYAxisMax = useMemo(() => {
    const values = series.flatMap((line) =>
      line.data
        .map((point) => point[1])
        .filter((value): value is number => value !== null)
    )

    return (
      yAxisMax ??
      calculateAxisMax(
        values.length > 0 ? values : [0],
        SANDBOX_MONITORING_CHART_Y_AXIS_SCALE_FACTOR
      )
    )
  }, [series, yAxisMax])

  const cssVarNames = useMemo(() => {
    const seriesVarNames = series.flatMap((line) =>
      [line.lineColorVar, line.areaColorVar, line.areaToColorVar].filter(
        (name): name is string => Boolean(name)
      )
    )
    const eventVarNames = lifecycleEventMarkers.map((event) => event.colorVar)

    return Array.from(
      new Set([
        SANDBOX_MONITORING_CHART_STROKE_VAR,
        SANDBOX_MONITORING_CHART_FG_VAR,
        SANDBOX_MONITORING_CHART_FG_TERTIARY_VAR,
        SANDBOX_MONITORING_CHART_FONT_MONO_VAR,
        ...seriesVarNames,
        ...eventVarNames,
      ])
    )
  }, [lifecycleEventMarkers, series])

  const cssVars = useCssVars(cssVarNames)

  const stroke =
    cssVars[SANDBOX_MONITORING_CHART_STROKE_VAR] ||
    SANDBOX_MONITORING_CHART_FALLBACK_STROKE
  const fgTertiary =
    cssVars[SANDBOX_MONITORING_CHART_FG_TERTIARY_VAR] ||
    SANDBOX_MONITORING_CHART_FALLBACK_FG_TERTIARY
  const fg = cssVars[SANDBOX_MONITORING_CHART_FG_VAR] || stroke
  const axisPointerColor = stroke
  const fontMono =
    cssVars[SANDBOX_MONITORING_CHART_FONT_MONO_VAR] ||
    SANDBOX_MONITORING_CHART_FALLBACK_FONT_MONO

  const handleUpdateAxisPointer = useCallback(
    (params: UpdateAxisPointerEventParams) => {
      if (!onHover) {
        return
      }

      const pointerValue =
        params.axesInfo?.[0]?.value ??
        params.xAxisInfo?.[0]?.value ??
        params.value
      const timestampMs = toNumericValue(pointerValue)
      if (Number.isNaN(timestampMs)) {
        return
      }

      const normalizedTimestampMs = Math.floor(timestampMs)
      onHover(normalizedTimestampMs)
    },
    [onHover]
  )

  const clearAxisPointer = useCallback(() => {
    chartInstanceRef.current?.dispatchAction({ type: 'hideTip' })
    chartInstanceRef.current?.dispatchAction({
      type: 'updateAxisPointer',
      currTrigger: 'leave',
    })
  }, [])

  const handleHoverLeave = useCallback(() => {
    clearAxisPointer()
    onHoverEnd?.()
  }, [clearAxisPointer, onHoverEnd])

  useEffect(() => {
    if (hoveredTimestampMs !== null) {
      return
    }

    clearAxisPointer()
  }, [clearAxisPointer, hoveredTimestampMs])

  const handleBrushEnd = useCallback(
    (params: BrushEndEventParams) => {
      const coordRange = params.areas?.[0]?.coordRange
      if (!coordRange || coordRange.length !== 2 || !onBrushEnd) {
        return
      }

      const startTimestamp = toNumericValue(coordRange[0])
      const endTimestamp = toNumericValue(coordRange[1])
      if (Number.isNaN(startTimestamp) || Number.isNaN(endTimestamp)) {
        return
      }

      onBrushEnd(
        Math.floor(Math.min(startTimestamp, endTimestamp)),
        Math.floor(Math.max(startTimestamp, endTimestamp))
      )

      chartInstanceRef.current?.dispatchAction({
        type: 'brush',
        command: 'clear',
        areas: [],
      })
    },
    [onBrushEnd]
  )

  const handleChartReady = useCallback((chart: echarts.ECharts) => {
    chartInstanceRef.current = chart

    chart.on('finished', () => {
      setChartRevision((v) => v + 1)
    })

    chart.dispatchAction(
      {
        type: 'takeGlobalCursor',
        key: 'brush',
        brushOption: {
          brushType: SANDBOX_MONITORING_CHART_BRUSH_TYPE,
          brushMode: SANDBOX_MONITORING_CHART_BRUSH_MODE,
        },
      },
      { flush: true }
    )

    chart.group = SANDBOX_MONITORING_CHART_GROUP
    echarts.connect(SANDBOX_MONITORING_CHART_GROUP)
  }, [])

  const option = useMemo<EChartsOption>(() => {
    const seriesItems: SeriesOption[] = series.flatMap((line) => {
      const lineColor = line.lineColorVar
        ? cssVars[line.lineColorVar]
        : undefined
      const areaFromColor = line.areaColorVar
        ? cssVars[line.areaColorVar]
        : undefined
      const areaToColor = line.areaToColorVar
        ? cssVars[line.areaToColorVar]
        : undefined
      const resolvedLineColor = lineColor || stroke
      const shouldShowArea = line.showArea ?? false
      const areaFillColor =
        areaFromColor && areaToColor
          ? {
              type: 'linear' as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: areaFromColor },
                { offset: 1, color: areaToColor },
              ],
            }
          : areaFromColor || resolvedLineColor
      const defaultAreaOpacity =
        areaFromColor || areaToColor ? 1 : SANDBOX_MONITORING_CHART_AREA_OPACITY
      const areaOpacity = normalizeOpacity(line.areaOpacity, defaultAreaOpacity)
      const renderableSegments = splitLineDataIntoRenderableSegments(line.data)
      const connectorSegments = line.connectors ?? []
      const livePoint = isLiveUpdating ? findLivePoint(line.data) : null

      const regularSeriesItems = renderableSegments.map(
        (segment, segmentIndex) => {
          const seriesItem: SeriesOption = {
            id: `${line.id}__segment_${segmentIndex}`,
            name: line.name,
            type: 'line',
            z: line.zIndex,
            symbol: 'none',
            showSymbol: false,
            smooth: false,
            emphasis: {
              disabled: true,
            },
            areaStyle: shouldShowArea
              ? {
                  opacity: areaOpacity,
                  color: areaFillColor,
                }
              : undefined,
            lineStyle: {
              width: SANDBOX_MONITORING_CHART_LINE_WIDTH,
              color: resolvedLineColor,
            },
            connectNulls: false,
            data: segment,
          }

          if (livePoint && segmentContainsPoint(segment, livePoint)) {
            seriesItem.markPoint = createLiveIndicators(
              livePoint,
              resolvedLineColor
            ) as MarkPointComponentOption
          }

          return seriesItem
        }
      )

      const connectorSeriesItems = connectorSegments.map(
        (connector, connectorIndex) =>
          ({
            id: `${line.id}__connector_${connectorIndex}`,
            name: line.name,
            type: 'line',
            z: (line.zIndex ?? 0) + 1,
            symbol: 'none',
            showSymbol: false,
            smooth: false,
            emphasis: {
              disabled: true,
            },
            areaStyle: shouldShowArea
              ? {
                  opacity: areaOpacity,
                  color: areaFillColor,
                }
              : undefined,
            lineStyle: {
              width: SANDBOX_MONITORING_CHART_LINE_WIDTH,
              color: resolvedLineColor,
              opacity: SANDBOX_MONITORING_CHART_CONNECTOR_LINE_OPACITY,
              type: 'dashed',
            },
            connectNulls: false,
            data: [
              [connector.from[0], connector.from[1]],
              [connector.to[0], connector.to[1]],
            ],
          }) satisfies SeriesOption
      )

      return [...regularSeriesItems, ...connectorSeriesItems]
    })

    return {
      backgroundColor: 'transparent',
      animation: false,
      brush: {
        brushType: SANDBOX_MONITORING_CHART_BRUSH_TYPE,
        brushMode: SANDBOX_MONITORING_CHART_BRUSH_MODE,
        xAxisIndex: 0,
        brushLink: 'all',
        brushStyle: { borderWidth: SANDBOX_MONITORING_CHART_LINE_WIDTH },
        outOfBrush: { colorAlpha: SANDBOX_MONITORING_CHART_OUT_OF_BRUSH_ALPHA },
      },
      grid: {
        top: grid.top,
        bottom: grid.bottom,
        left: grid.left,
        right: grid.right,
      },
      xAxis: {
        type: 'time',
        min: xAxisMin,
        max: xAxisMax,
        boundaryGap: [0, 0],
        axisLine: { show: true, lineStyle: { color: stroke } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          show: showXAxisLabels,
          color: fgTertiary,
          fontFamily: fontMono,
          fontSize: SANDBOX_MONITORING_CHART_AXIS_LABEL_FONT_SIZE,
          hideOverlap: true,
          formatter: (value: number | string) => formatXAxisLabel(value),
        },
        axisPointer: {
          show: true,
          type: 'line',
          lineStyle: {
            color: axisPointerColor,
            type: 'solid',
            width: SANDBOX_MONITORING_CHART_LINE_WIDTH,
          },
          snap: false,
          label: {
            show: false,
          },
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: computedYAxisMax,
        interval: computedYAxisMax / 2,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          show: true,
          lineStyle: { color: stroke, type: 'dashed' },
          interval: 0,
        },
        axisLabel: {
          show: true,
          color: fgTertiary,
          fontFamily: fontMono,
          fontSize: SANDBOX_MONITORING_CHART_AXIS_LABEL_FONT_SIZE,
          interval: 0,
          formatter: yAxisFormatter,
        },
        axisPointer: { show: false },
      },
      series: seriesItems,
    }
  }, [
    cssVars,
    axisPointerColor,
    computedYAxisMax,
    fgTertiary,
    fontMono,
    grid,
    series,
    showXAxisLabels,
    stroke,
    xAxisMax,
    xAxisMin,
    yAxisFormatter,
  ])

  useEffect(() => {
    const chart = chartInstanceRef.current
    if (!chart || chart.isDisposed()) {
      return
    }

    // echarts-for-react uses merge mode (notMerge: false) by default, which
    // keeps stale series whose IDs are absent from the new option. We follow
    // up with replaceMerge for the series array only — this removes stale
    // connector/segment series without resetting brush or axis pointer state.
    chart.setOption({ series: option.series }, { replaceMerge: ['series'] })
  }, [option])

  const crosshairMarkers = useMemo<CrosshairMarker[]>(() => {
    void chartRevision

    if (hoveredTimestampMs === null) {
      return []
    }

    const chart = chartInstanceRef.current
    if (!chart || chart.isDisposed()) {
      return []
    }

    const firstTimestamps = series
      .map((line) => findFirstValidPointTimestampMs(line.data))
      .filter((value): value is number => value !== null)
    const firstTimestampMs =
      firstTimestamps.length > 0 ? Math.min(...firstTimestamps) : null
    const firstPointPixel =
      firstTimestampMs !== null
        ? chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
            firstTimestampMs,
            0,
          ])
        : null
    const firstPointPx =
      Array.isArray(firstPointPixel) &&
      firstPointPixel.length > 0 &&
      typeof firstPointPixel[0] === 'number' &&
      Number.isFinite(firstPointPixel[0])
        ? firstPointPixel[0]
        : null

    const markers = series.flatMap((line) => {
      const closestPoint = findClosestValidPoint(line.data, hoveredTimestampMs)
      if (!closestPoint) {
        return []
      }

      const pixel = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
        closestPoint.timestampMs,
        closestPoint.value,
      ])
      if (!Array.isArray(pixel) || pixel.length < 2) {
        return []
      }

      const xPx = pixel[0]
      const yPx = pixel[1]
      if (
        typeof xPx !== 'number' ||
        typeof yPx !== 'number' ||
        !Number.isFinite(xPx) ||
        !Number.isFinite(yPx)
      ) {
        return []
      }

      return [
        {
          key: `${line.id}-${closestPoint.timestampMs}`,
          xPx,
          yPx,
          valueContent: line.markerValueFormatter
            ? line.markerValueFormatter({
                value: closestPoint.value,
                markerValue: closestPoint.markerValue,
              })
            : yAxisFormatter(closestPoint.value),
          dotColor: line.lineColorVar
            ? (cssVars[line.lineColorVar] ?? stroke)
            : stroke,
          placeValueOnRight:
            firstPointPx !== null &&
            xPx - firstPointPx <=
              SANDBOX_MONITORING_CHART_MARKER_RIGHT_THRESHOLD_PX,
          labelOffsetYPx: 0,
        },
      ]
    })

    return applyMarkerLabelOffsets(markers)
  }, [
    chartRevision,
    cssVars,
    hoveredTimestampMs,
    series,
    stroke,
    yAxisFormatter,
  ])

  const xAxisHoverBadge = useMemo(() => {
    void chartRevision

    if (!showXAxisLabels || hoveredTimestampMs === null) {
      return null
    }

    const chart = chartInstanceRef.current
    if (!chart || chart.isDisposed()) {
      return null
    }

    const pixel = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
      hoveredTimestampMs,
      0,
    ])
    if (!Array.isArray(pixel) || pixel.length < 1) {
      return null
    }

    const xPx = pixel[0]
    if (typeof xPx !== 'number' || !Number.isFinite(xPx)) {
      return null
    }

    return {
      xPx,
      label: formatXAxisLabel(hoveredTimestampMs, true),
    }
  }, [chartRevision, hoveredTimestampMs, showXAxisLabels])

  const lifecycleEventOverlays = useMemo<LifecycleEventOverlay[]>(() => {
    void chartRevision

    if (lifecycleEventMarkers.length === 0) {
      return []
    }

    const chart = chartInstanceRef.current
    if (!chart || chart.isDisposed()) {
      return []
    }

    const chartWidth = chart.getWidth()
    const midpointPx = chartWidth / 2

    const baseOverlays = lifecycleEventMarkers.flatMap((event) => {
      const topPixel = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
        event.timestampMs,
        computedYAxisMax,
      ])
      const bottomPixel = chart.convertToPixel(
        { xAxisIndex: 0, yAxisIndex: 0 },
        [event.timestampMs, 0]
      )
      if (
        !Array.isArray(topPixel) ||
        !Array.isArray(bottomPixel) ||
        topPixel.length < 2 ||
        bottomPixel.length < 2
      ) {
        return []
      }

      const xPx = topPixel[0]
      const topValuePx = topPixel[1]
      const bottomValuePx = bottomPixel[1]
      if (
        typeof xPx !== 'number' ||
        typeof topValuePx !== 'number' ||
        typeof bottomValuePx !== 'number' ||
        !Number.isFinite(xPx) ||
        !Number.isFinite(topValuePx) ||
        !Number.isFinite(bottomValuePx)
      ) {
        return []
      }

      const anchorTopPx = Math.min(topValuePx, bottomValuePx)
      const baseLabelTopPx = SANDBOX_MONITORING_CHART_EVENT_LABEL_TOP_PX
      const color = cssVars[event.colorVar] ?? fg
      const labelXPx = xPx

      if (!Number.isFinite(anchorTopPx)) {
        return []
      }

      return [
        {
          key: event.id,
          type: event.type,
          xPx,
          anchorTopPx,
          bottomPx: bottomValuePx,
          label: event.label,
          timestampMs: event.timestampMs,
          labelXPx,
          baseLabelTopPx,
          labelTopPx: baseLabelTopPx,
          estimatedLabelWidthPx: estimateLifecycleEventLabelWidthPx(),
          color,
          alignRight: xPx > midpointPx,
        } satisfies LifecycleEventOverlayLayout,
      ]
    })

    return applyLifecycleEventLabelOffsets(baseOverlays).flatMap((overlay) => {
      const lineTopPx = overlay.anchorTopPx
      const heightPx = Math.max(Math.abs(overlay.bottomPx - lineTopPx), 0)

      if (!Number.isFinite(lineTopPx) || heightPx <= 0) {
        return []
      }

      return [
        {
          key: overlay.key,
          type: overlay.type,
          xPx: overlay.xPx,
          topPx: lineTopPx,
          heightPx,
          label: overlay.label,
          timestampMs: overlay.timestampMs,
          labelXPx: overlay.labelXPx,
          labelTopPx: overlay.labelTopPx,
          color: overlay.color,
          alignRight: overlay.alignRight,
        } satisfies LifecycleEventOverlay,
      ]
    })
  }, [chartRevision, computedYAxisMax, cssVars, fg, lifecycleEventMarkers])

  const showOverlay =
    lifecycleEventOverlays.length > 0 ||
    crosshairMarkers.length > 0 ||
    xAxisHoverBadge !== null

  return (
    <div className={cn('relative h-full w-full', className)}>
      <ReactEChartsCore
        key={resolvedTheme}
        echarts={echarts}
        option={option}
        style={{ width: '100%', height: '100%' }}
        onChartReady={handleChartReady}
        className="h-full w-full"
        onEvents={{
          globalout: handleHoverLeave,
          brushEnd: handleBrushEnd,
          updateAxisPointer: handleUpdateAxisPointer,
        }}
      />
      {showOverlay ? (
        <div className="pointer-events-none absolute inset-0">
          {lifecycleEventOverlays.map((eventOverlay) => {
            const IconComponent =
              SANDBOX_LIFECYCLE_EVENT_ICON_MAP[eventOverlay.type]

            return (
              <div key={eventOverlay.key}>
                <span
                  className="absolute -translate-x-1/2 transition-opacity"
                  data-event-line={eventOverlay.key}
                  style={{
                    left: eventOverlay.xPx,
                    top: eventOverlay.topPx,
                    height: eventOverlay.heightPx,
                    width: SANDBOX_MONITORING_CHART_LINE_WIDTH,
                    backgroundImage: `repeating-linear-gradient(to bottom, ${eventOverlay.color} 0px, ${eventOverlay.color} 4px, transparent 4px, transparent 6px)`,
                    opacity: SANDBOX_MONITORING_CHART_EVENT_LINE_BASE_OPACITY,
                    zIndex: 12,
                  }}
                />
                {showEventLabels ? (
                  <div
                    style={{
                      left: eventOverlay.labelXPx,
                      top: eventOverlay.labelTopPx,
                      color: eventOverlay.color,
                      zIndex: 18,
                    }}
                    className="group/event pointer-events-auto absolute"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.zIndex = '30'
                      const line = e.currentTarget.parentElement?.querySelector(
                        `[data-event-line="${eventOverlay.key}"]`
                      ) as HTMLElement | null
                      if (line) {
                        line.style.opacity = '1'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.zIndex = '18'
                      const line = e.currentTarget.parentElement?.querySelector(
                        `[data-event-line="${eventOverlay.key}"]`
                      ) as HTMLElement | null
                      if (line) {
                        line.style.opacity = String(
                          SANDBOX_MONITORING_CHART_EVENT_LINE_BASE_OPACITY
                        )
                      }
                    }}
                  >
                    <div className="relative -translate-x-1/2">
                      <div className="flex items-center justify-center p-1">
                        {IconComponent ? (
                          <IconComponent
                            size={SANDBOX_MONITORING_CHART_EVENT_ICON_SIZE}
                            strokeWidth={2}
                          />
                        ) : null}
                      </div>
                      <div
                        className={cn(
                          'absolute top-0 flex h-full items-center overflow-hidden transition-[max-width] duration-200 ease-out',
                          'max-w-0 group-hover/event:max-w-60',
                          eventOverlay.alignRight
                            ? 'right-full justify-end'
                            : 'left-full'
                        )}
                      >
                        <div
                          className={cn(
                            'flex items-center gap-1.5 whitespace-nowrap leading-none',
                            eventOverlay.alignRight ? 'pr-1.5' : 'pl-1.5'
                          )}
                        >
                          <span className="prose-label uppercase">
                            {eventOverlay.label}
                          </span>
                          <span className="prose-label-numeric font-mono text-current/60">
                            {formatEventTimestamp(eventOverlay.timestampMs)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}

          {crosshairMarkers.map((marker) => (
            <div
              key={marker.key}
              className="absolute"
              style={{
                left: marker.xPx,
                top: marker.yPx,
                zIndex: 30,
              }}
            >
              <span
                className="absolute size-2 -translate-x-1/2 -translate-y-1/2 border border-bg-1"
                style={{ backgroundColor: marker.dotColor }}
              />
              <div
                style={{
                  backgroundColor: withOpacity(
                    marker.dotColor,
                    SANDBOX_MONITORING_CHART_MARKER_BG_OPACITY
                  ),
                  borderColor: withOpacity(
                    marker.dotColor,
                    SANDBOX_MONITORING_CHART_MARKER_BORDER_OPACITY
                  ),
                  marginTop: marker.labelOffsetYPx,
                }}
                className={cn(
                  'pointer-events-auto prose-label-numeric absolute top-1/2 border text-fg font-mono -translate-y-1/2 whitespace-nowrap px-2 py-0.5 backdrop-blur-lg',
                  marker.placeValueOnRight ? 'left-2' : 'right-2'
                )}
              >
                {marker.valueContent}
              </div>
            </div>
          ))}

          {xAxisHoverBadge ? (
            <div
              className="prose-label-numeric bg-bg/60 font-mono absolute bottom-4 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 text-fg backdrop-blur-lg"
              style={{
                left: xAxisHoverBadge.xPx,
                borderColor: axisPointerColor,
                zIndex: 20,
              }}
            >
              {xAxisHoverBadge.label}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

const MemoizedSandboxMetricsChart = memo(SandboxMetricsChart)

MemoizedSandboxMetricsChart.displayName = 'SandboxMetricsChart'

export default MemoizedSandboxMetricsChart
