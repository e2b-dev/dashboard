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
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { normalizeOpacity } from '../utils/chart-colors'
import {
  findLivePoint,
  formatXAxisLabel,
  segmentContainsPoint,
  splitLineDataIntoRenderableSegments,
  toNumericValue,
} from '../utils/chart-data-utils'
import {
  SANDBOX_MONITORING_CHART_AREA_OPACITY,
  SANDBOX_MONITORING_CHART_AXIS_LABEL_FONT_SIZE,
  SANDBOX_MONITORING_CHART_BRUSH_MODE,
  SANDBOX_MONITORING_CHART_BRUSH_TYPE,
  SANDBOX_MONITORING_CHART_CONNECTOR_LINE_OPACITY,
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
  SANDBOX_MONITORING_CHART_OUT_OF_BRUSH_ALPHA,
  SANDBOX_MONITORING_CHART_STROKE_VAR,
  SANDBOX_MONITORING_CHART_Y_AXIS_SCALE_FACTOR,
} from '../utils/constants'
import { useCssVars } from '@/lib/hooks/use-css-vars'
import { cn } from '@/lib/utils'
import { calculateAxisMax } from '@/lib/utils/chart'
import { formatAxisNumber } from '@/lib/utils/formatting'
import type {
  SandboxMetricsChartProps,
  SandboxMetricsDataPoint,
} from '../types/sandbox-metrics-chart'
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

  const { crosshairMarkers, xAxisHoverBadge, lifecycleEventOverlays } =
    useChartOverlays({
      chartInstanceRef,
      chartRevision,
      series,
      lifecycleEventMarkers,
      hoveredTimestampMs,
      showXAxisLabels,
      showEventLabels,
      computedYAxisMax,
      cssVars,
      stroke,
      fg,
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
        onEvents={{
          globalout: handleHoverLeave,
          brushEnd: handleBrushEnd,
          updateAxisPointer: handleUpdateAxisPointer,
        }}
      />
      <ChartOverlayLayer
        lifecycleEventOverlays={lifecycleEventOverlays}
        crosshairMarkers={crosshairMarkers}
        xAxisHoverBadge={xAxisHoverBadge}
        showEventLabels={showEventLabels}
        axisPointerColor={axisPointerColor}
      />
    </div>
  )
}

const MemoizedSandboxMetricsChart = memo(SandboxMetricsChart)

MemoizedSandboxMetricsChart.displayName = 'SandboxMetricsChart'

export default MemoizedSandboxMetricsChart
