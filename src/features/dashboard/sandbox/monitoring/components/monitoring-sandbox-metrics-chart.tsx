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
  SANDBOX_MONITORING_CHART_FALLBACK_FG_TERTIARY,
  SANDBOX_MONITORING_CHART_FALLBACK_FONT_MONO,
  SANDBOX_MONITORING_CHART_FALLBACK_STROKE,
  SANDBOX_MONITORING_CHART_FG_TERTIARY_VAR,
  SANDBOX_MONITORING_CHART_FONT_MONO_VAR,
  SANDBOX_MONITORING_CHART_GRID_BOTTOM,
  SANDBOX_MONITORING_CHART_GRID_BOTTOM_WITH_X_AXIS,
  SANDBOX_MONITORING_CHART_GRID_RIGHT,
  SANDBOX_MONITORING_CHART_GRID_TOP,
  SANDBOX_MONITORING_CHART_GROUP,
  SANDBOX_MONITORING_CHART_LINE_WIDTH,
  SANDBOX_MONITORING_CHART_LIVE_INNER_DOT_SIZE,
  SANDBOX_MONITORING_CHART_LIVE_MIDDLE_DOT_SIZE,
  SANDBOX_MONITORING_CHART_LIVE_OUTER_DOT_SIZE,
  SANDBOX_MONITORING_CHART_LIVE_WINDOW_MS,
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

const SANDBOX_MONITORING_CHART_FG_VAR = '--fg'
const SANDBOX_MONITORING_CHART_MARKER_RIGHT_THRESHOLD_PX = 86
const SANDBOX_MONITORING_CHART_MARKER_OVERLAP_THRESHOLD_PX = 24
const SANDBOX_MONITORING_CHART_MARKER_LABEL_VERTICAL_GAP_PX = 20

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
  hoveredTimestampMs = null,
  className,
  showXAxisLabels = true,
  yAxisMax,
  yAxisFormatter = formatAxisNumber,
  onHover,
  onHoverEnd,
  onBrushEnd,
}: SandboxMetricsChartProps) {
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const [chartRevision, setChartRevision] = useState(0)
  const { resolvedTheme } = useTheme()

  const cssVarNames = useMemo(() => {
    const dynamicVarNames = series.flatMap((line) =>
      [line.lineColorVar, line.areaColorVar, line.areaToColorVar].filter(
        (name): name is string => Boolean(name)
      )
    )

    return Array.from(
      new Set([
        SANDBOX_MONITORING_CHART_STROKE_VAR,
        SANDBOX_MONITORING_CHART_FG_VAR,
        SANDBOX_MONITORING_CHART_FG_TERTIARY_VAR,
        SANDBOX_MONITORING_CHART_FONT_MONO_VAR,
        ...dynamicVarNames,
      ])
    )
  }, [series])

  const cssVars = useCssVars(cssVarNames)

  const stroke =
    cssVars[SANDBOX_MONITORING_CHART_STROKE_VAR] ||
    SANDBOX_MONITORING_CHART_FALLBACK_STROKE
  const fgTertiary =
    cssVars[SANDBOX_MONITORING_CHART_FG_TERTIARY_VAR] ||
    SANDBOX_MONITORING_CHART_FALLBACK_FG_TERTIARY
  const fg = cssVars[SANDBOX_MONITORING_CHART_FG_VAR] || stroke
  const axisPointerColor = withOpacity(fg, 0.7)
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
    setChartRevision((v) => v + 1)

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
    const values = series.flatMap((line) =>
      line.data
        .map((point) => point[1])
        .filter((value): value is number => value !== null)
    )
    const computedYAxisMax =
      yAxisMax ??
      calculateAxisMax(
        values.length > 0 ? values : [0],
        SANDBOX_MONITORING_CHART_Y_AXIS_SCALE_FACTOR
      )

    const seriesItems: SeriesOption[] = series.map((line) => {
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
      const livePoint = findLivePoint(line.data)
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

      const seriesItem: SeriesOption = {
        id: line.id,
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
        data: line.data,
      }

      if (livePoint) {
        seriesItem.markPoint = createLiveIndicators(
          livePoint,
          resolvedLineColor
        ) as MarkPointComponentOption
      }

      return seriesItem
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
        top: SANDBOX_MONITORING_CHART_GRID_TOP,
        bottom: showXAxisLabels
          ? SANDBOX_MONITORING_CHART_GRID_BOTTOM_WITH_X_AXIS
          : SANDBOX_MONITORING_CHART_GRID_BOTTOM,
        left: 36,
        right: SANDBOX_MONITORING_CHART_GRID_RIGHT,
      },
      xAxis: {
        type: 'time',
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
          snap: true,
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
    fgTertiary,
    fontMono,
    series,
    showXAxisLabels,
    stroke,
    yAxisFormatter,
    yAxisMax,
  ])

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
                point: [
                  closestPoint.timestampMs,
                  closestPoint.value,
                  closestPoint.markerValue,
                ],
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
  }, [chartRevision, cssVars, hoveredTimestampMs, series, stroke, yAxisFormatter])

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

  const showOverlay = crosshairMarkers.length > 0 || xAxisHoverBadge !== null

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
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {crosshairMarkers.map((marker) => (
            <div
              key={marker.key}
              className="absolute"
              style={{
                left: marker.xPx,
                top: marker.yPx,
              }}
            >
              <span
                className="absolute size-2 -translate-x-1/2 -translate-y-1/2 border border-bg-1"
                style={{ backgroundColor: marker.dotColor }}
              />
              <div
                style={{
                  backgroundColor: withOpacity(marker.dotColor, 0.1),
                  borderColor: withOpacity(marker.dotColor, 0.12),
                  marginTop: marker.labelOffsetYPx,
                }}
                className={cn(
                  'prose-label-numeric absolute top-1/2 border text-fg font-mono -translate-y-1/2 whitespace-nowrap px-2 py-0.5 backdrop-blur-lg z-9999',
                  marker.placeValueOnRight ? 'left-2' : 'right-2'
                )}
              >
                {marker.valueContent}
              </div>
            </div>
          ))}

          {xAxisHoverBadge ? (
            <div
              className="prose-label-numeric bg-bg/60 font-mono absolute bottom-0 z-9999 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 text-fg backdrop-blur-lg"
              style={{
                left: xAxisHoverBadge.xPx,
                borderColor: axisPointerColor,
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
