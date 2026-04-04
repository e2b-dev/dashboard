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
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { calculateStepForDuration } from '@/features/dashboard/sandboxes/monitoring/utils'
import { useCssVars } from '@/lib/hooks/use-css-vars'
import { cn } from '@/lib/utils'
import { calculateAxisMax } from '@/lib/utils/chart'
import { formatAxisNumber } from '@/lib/utils/formatting'
import type { SandboxMetricsChartProps } from '../types/sandbox-metrics-chart'
import { normalizeOpacity, withOpacity } from '../utils/chart-colors'
import {
  findLivePoint,
  formatXAxisLabel,
  segmentContainsPoint,
  splitLineDataIntoRenderableSegments,
  toNumericValue,
} from '../utils/chart-data-utils'
import {
  SANDBOX_MONITORING_CHART_FALLBACK_STROKE,
  SANDBOX_MONITORING_CHART_FG_VAR,
  SANDBOX_MONITORING_CHART_LINE_WIDTH,
  SANDBOX_MONITORING_CHART_STROKE_VAR,
} from '../utils/constants'
import { ChartOverlayLayer } from './chart-overlays'
import { useChartOverlays } from './use-chart-overlays'

echarts.use([
  LineChart,
  GridComponent,
  BrushComponent,
  MarkPointComponent,
  SVGRenderer,
  AxisPointerComponent,
])

const CHART_GROUP = 'sandbox-monitoring'
const CHART_FG_TERTIARY_VAR = '--fg-tertiary'
const CHART_FONT_MONO_VAR = '--font-mono'
const CHART_FALLBACK_FG_TERTIARY = '#666'
const CHART_FALLBACK_FONT_MONO = 'monospace'
const CHART_AREA_OPACITY = 0.18
const CHART_CONNECTOR_LINE_OPACITY = 0.8
const CHART_OUT_OF_BRUSH_ALPHA = 0.25
const CHART_AXIS_LABEL_FONT_SIZE = 12
const CHART_Y_AXIS_SCALE_FACTOR = 1.5
const CHART_LIVE_WINDOW_STEPS = 2
const CHART_LIVE_OUTER_DOT_SIZE = 16
const CHART_LIVE_MIDDLE_DOT_SIZE = 10
const CHART_LIVE_INNER_DOT_SIZE = 6

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
        symbolSize: CHART_LIVE_OUTER_DOT_SIZE,
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
        symbolSize: CHART_LIVE_MIDDLE_DOT_SIZE,
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
        symbolSize: CHART_LIVE_INNER_DOT_SIZE,
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
  isPolling = false,
  isMobile = false,
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
        CHART_Y_AXIS_SCALE_FACTOR
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
        CHART_FG_TERTIARY_VAR,
        CHART_FONT_MONO_VAR,
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
    cssVars[CHART_FG_TERTIARY_VAR] || CHART_FALLBACK_FG_TERTIARY
  const axisPointerColor = stroke
  const fontMono = cssVars[CHART_FONT_MONO_VAR] || CHART_FALLBACK_FONT_MONO

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

      let normalizedTimestampMs = Math.floor(timestampMs)
      if (xAxisMin !== undefined) {
        normalizedTimestampMs = Math.max(xAxisMin, normalizedTimestampMs)
      }
      if (xAxisMax !== undefined) {
        normalizedTimestampMs = Math.min(xAxisMax, normalizedTimestampMs)
      }
      onHover(normalizedTimestampMs)
    },
    [onHover, xAxisMin, xAxisMax]
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

  const handleChartReady = useCallback(
    (chart: echarts.ECharts) => {
      chartInstanceRef.current = chart

      chart.on('finished', () => {
        setChartRevision((v) => v + 1)
      })

      if (!isMobile) {
        chart.dispatchAction(
          {
            type: 'takeGlobalCursor',
            key: 'brush',
            brushOption: {
              brushType: 'lineX',
              brushMode: 'single',
            },
          },
          { flush: true }
        )
      }

      chart.group = CHART_GROUP
      echarts.connect(CHART_GROUP)
    },
    [isMobile]
  )

  const liveWindowMs = useMemo(() => {
    const duration =
      xAxisMax !== undefined && xAxisMin !== undefined ? xAxisMax - xAxisMin : 0
    return CHART_LIVE_WINDOW_STEPS * calculateStepForDuration(duration)
  }, [xAxisMax, xAxisMin])

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
      const hasGradientColors = Boolean(areaFromColor && areaToColor)

      // Build a linear gradient whose visible range always maps to
      // [computedYAxisMax … 0] regardless of the series bounding box.
      // ECharts scopes local gradients to each series' bounding box, so a
      // connector at y=45 gets a different gradient than a segment peaking
      // at y=80. Extending `y` above the bounding box (negative value)
      // aligns all gradients to the full Y axis range.
      const makeAreaFillColor = (maxDataY: number) => {
        if (!hasGradientColors) {
          return areaFromColor || resolvedLineColor
        }

        const gradientY = maxDataY > 0 ? 1 - computedYAxisMax / maxDataY : 0

        return {
          type: 'linear' as const,
          x: 0,
          y: gradientY,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: areaFromColor! },
            { offset: 1, color: areaToColor! },
          ],
        }
      }

      const defaultAreaOpacity = hasGradientColors ? 1 : CHART_AREA_OPACITY
      const areaOpacity = normalizeOpacity(line.areaOpacity, defaultAreaOpacity)
      const renderableSegments = splitLineDataIntoRenderableSegments(line.data)
      const connectorSegments = line.connectors ?? []
      const livePoint = isPolling
        ? findLivePoint(line.data, liveWindowMs)
        : null

      const regularSeriesItems = renderableSegments.map(
        (segment, segmentIndex) => {
          const segmentMaxY = segment.reduce((max, point) => {
            const value = point[1]
            return typeof value === 'number' && value > max ? value : max
          }, 0)

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
                  color: makeAreaFillColor(segmentMaxY),
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
        (connector, connectorIndex) => {
          const connectorMaxY = Math.max(connector.from[1], connector.to[1])

          return {
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
                  color: makeAreaFillColor(connectorMaxY),
                }
              : undefined,
            lineStyle: {
              width: SANDBOX_MONITORING_CHART_LINE_WIDTH,
              color: resolvedLineColor,
              opacity: connector.isSynthetic
                ? CHART_CONNECTOR_LINE_OPACITY * 0.6
                : CHART_CONNECTOR_LINE_OPACITY,
              type: 'dashed',
            },
            connectNulls: false,
            data: [
              [connector.from[0], connector.from[1]],
              [connector.to[0], connector.to[1]],
            ],
          } satisfies SeriesOption
        }
      )

      return [...regularSeriesItems, ...connectorSeriesItems]
    })

    return {
      backgroundColor: 'transparent',
      animation: false,
      brush: isMobile
        ? undefined
        : {
            brushType: 'lineX',
            brushMode: 'single',
            xAxisIndex: 0,
            brushLink: 'all',
            brushStyle: { borderWidth: SANDBOX_MONITORING_CHART_LINE_WIDTH },
            outOfBrush: {
              colorAlpha: CHART_OUT_OF_BRUSH_ALPHA,
            },
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
          fontSize: CHART_AXIS_LABEL_FONT_SIZE,
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
          lineStyle: { color: withOpacity(stroke, 0.7), type: 'dashed' },
          interval: 0,
        },
        axisLabel: {
          show: true,
          color: fgTertiary,
          fontFamily: fontMono,
          fontSize: CHART_AXIS_LABEL_FONT_SIZE,
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
    isMobile,
    isPolling,
    liveWindowMs,
    series,
    showXAxisLabels,
    stroke,
    xAxisMax,
    xAxisMin,
    yAxisFormatter,
  ])

  // echarts-for-react uses merge mode (notMerge: false) by default, which
  // keeps stale series whose IDs are absent from the new option. We follow
  // up with replaceMerge for the series array only — this removes stale
  // connector/segment series without resetting brush or axis pointer state.
  // We do NOT bump chartRevision here — convertToPixel only returns correct
  // values after ECharts' internal render completes and fires the `finished`
  // event (registered in handleChartReady).
  useEffect(() => {
    const chart = chartInstanceRef.current
    if (!chart || chart.isDisposed()) {
      return
    }

    chart.setOption({ series: option.series }, { replaceMerge: ['series'] })
  }, [option])

  const onEvents = useMemo(
    () => ({
      globalout: handleHoverLeave,
      brushEnd: handleBrushEnd,
      updateAxisPointer: handleUpdateAxisPointer,
    }),
    [handleHoverLeave, handleBrushEnd, handleUpdateAxisPointer]
  )

  const { crosshairMarkers, xAxisHoverBadge, lifecycleEventOverlays } =
    useChartOverlays({
      chartInstanceRef,
      chartRevision,
      series,
      lifecycleEventMarkers,
      hoveredTimestampMs,
      xAxisMin,
      xAxisMax,
      showXAxisLabels,
      isMobile,
      computedYAxisMax,
      cssVars,
      yAxisFormatter,
    })

  return (
    <div className={cn('relative h-full w-full', className)}>
      <ReactEChartsCore
        key={resolvedTheme}
        echarts={echarts}
        option={option}
        style={{ width: '100%', height: '100%' }}
        onChartReady={handleChartReady}
        className="h-full w-full"
        onEvents={onEvents}
      />
      <ChartOverlayLayer
        lifecycleEventOverlays={lifecycleEventOverlays}
        crosshairMarkers={crosshairMarkers}
        xAxisHoverBadge={xAxisHoverBadge}
        showEventLabels={showEventLabels}
        isMobile={isMobile}
        axisPointerColor={axisPointerColor}
      />
    </div>
  )
}

const MemoizedSandboxMetricsChart = memo(SandboxMetricsChart)

MemoizedSandboxMetricsChart.displayName = 'SandboxMetricsChart'

export default MemoizedSandboxMetricsChart
