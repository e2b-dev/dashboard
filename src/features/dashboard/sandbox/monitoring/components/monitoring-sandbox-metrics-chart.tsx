'use client'

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
  SANDBOX_MONITORING_CHART_GROUP,
  SANDBOX_MONITORING_CHART_LINE_WIDTH,
  SANDBOX_MONITORING_CHART_LIVE_INNER_DOT_SIZE,
  SANDBOX_MONITORING_CHART_LIVE_MIDDLE_DOT_SIZE,
  SANDBOX_MONITORING_CHART_LIVE_OUTER_DOT_SIZE,
  SANDBOX_MONITORING_CHART_LIVE_WINDOW_MS,
  SANDBOX_MONITORING_CHART_OUT_OF_BRUSH_ALPHA,
  SANDBOX_MONITORING_CHART_STACK_ID,
  SANDBOX_MONITORING_CHART_STROKE_VAR,
  SANDBOX_MONITORING_CHART_Y_AXIS_SCALE_FACTOR,
} from '@/features/dashboard/sandbox/monitoring/utils/constants'
import { useCssVars } from '@/lib/hooks/use-css-vars'
import { calculateAxisMax } from '@/lib/utils/chart'
import { formatAxisNumber } from '@/lib/utils/formatting'
import { EChartsOption, MarkPointComponentOption, SeriesOption } from 'echarts'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import { LineChart } from 'echarts/charts'
import {
  AxisPointerComponent,
  BrushComponent,
  GridComponent,
  MarkPointComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useTheme } from 'next-themes'
import { memo, useCallback, useMemo, useRef } from 'react'
import type {
  SandboxMetricsChartProps,
  SandboxMetricsDataPoint,
} from '../types/sandbox-metrics-chart'

echarts.use([
  LineChart,
  GridComponent,
  BrushComponent,
  MarkPointComponent,
  CanvasRenderer,
  AxisPointerComponent,
])

interface AxisPointerEventParams {
  seriesData?: Array<{ dataIndex?: number }>
  value?: unknown
  axisValue?: unknown
}

interface BrushArea {
  coordRange?: [unknown, unknown] | unknown[]
}

interface BrushEndEventParams {
  areas?: BrushArea[]
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

function resolveStartIndex(categories: number[], value: unknown): number {
  if (categories.length === 0) {
    return 0
  }

  const numericValue = toNumericValue(value)
  if (Number.isNaN(numericValue)) {
    return 0
  }

  if (numericValue >= 0 && numericValue <= categories.length - 1) {
    return Math.max(0, Math.min(categories.length - 1, Math.floor(numericValue)))
  }

  const foundIndex = categories.findIndex((timestamp) => timestamp >= numericValue)
  return foundIndex === -1 ? categories.length - 1 : foundIndex
}

function resolveEndIndex(categories: number[], value: unknown): number {
  if (categories.length === 0) {
    return 0
  }

  const numericValue = toNumericValue(value)
  if (Number.isNaN(numericValue)) {
    return categories.length - 1
  }

  if (numericValue >= 0 && numericValue <= categories.length - 1) {
    return Math.max(0, Math.min(categories.length - 1, Math.ceil(numericValue)))
  }

  for (let index = categories.length - 1; index >= 0; index -= 1) {
    const timestamp = categories[index]

    if (timestamp !== undefined && timestamp <= numericValue) {
      return index
    }
  }

  return 0
}

function formatXAxisLabel(value: number | string): string {
  const timestamp = Number(value)
  if (Number.isNaN(timestamp)) {
    return ''
  }

  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${hours}:${minutes}`
}

function findLivePoint(
  categories: number[],
  data: SandboxMetricsDataPoint[],
  now: number = Date.now()
): { x: number; y: number } | null {
  const liveBoundary = now - SANDBOX_MONITORING_CHART_LIVE_WINDOW_MS

  for (let index = data.length - 1; index >= 0; index -= 1) {
    const point = data[index]
    const timestamp = categories[index]

    if (!point || typeof point.y !== 'number' || timestamp === undefined) {
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
      y: point.y,
    }
  }

  return null
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
  categories,
  series,
  className,
  stacked = false,
  showArea = false,
  showXAxisLabels = true,
  yAxisMax,
  yAxisFormatter = formatAxisNumber,
  onHover,
  onHoverEnd,
  onBrushEnd,
}: SandboxMetricsChartProps) {
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
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
  const fontMono =
    cssVars[SANDBOX_MONITORING_CHART_FONT_MONO_VAR] ||
    SANDBOX_MONITORING_CHART_FALLBACK_FONT_MONO

  const handleAxisPointer = useCallback(
    (params: AxisPointerEventParams) => {
      if (!onHover) {
        return ''
      }

      const dataIndex = params.seriesData?.[0]?.dataIndex
      if (typeof dataIndex === 'number') {
        onHover(dataIndex)
        return ''
      }

      const pointerValue = params.value ?? params.axisValue
      const normalizedValue = toNumericValue(pointerValue)
      if (Number.isNaN(normalizedValue)) {
        return ''
      }

      const matchedIndex = categories.findIndex((value) => value === normalizedValue)
      if (matchedIndex >= 0) {
        onHover(matchedIndex)
      }

      return ''
    },
    [categories, onHover]
  )

  const handleGlobalOut = useCallback(() => {
    onHoverEnd?.()
  }, [onHoverEnd])

  const handleBrushEnd = useCallback(
    (params: BrushEndEventParams) => {
      const coordRange = params.areas?.[0]?.coordRange
      if (!coordRange || coordRange.length !== 2 || !onBrushEnd) {
        return
      }

      const rawStartIndex = resolveStartIndex(categories, coordRange[0])
      const rawEndIndex = resolveEndIndex(categories, coordRange[1])
      const startIndex = Math.min(rawStartIndex, rawEndIndex)
      const endIndex = Math.max(rawStartIndex, rawEndIndex)
      const startTimestamp = categories[startIndex]
      const endTimestamp = categories[endIndex]

      if (startTimestamp !== undefined && endTimestamp !== undefined) {
        onBrushEnd(startTimestamp, endTimestamp)
      }

      chartInstanceRef.current?.dispatchAction({
        type: 'brush',
        command: 'clear',
        areas: [],
      })
    },
    [categories, onBrushEnd]
  )

  const handleChartReady = useCallback((chart: echarts.ECharts) => {
    chartInstanceRef.current = chart

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
        .map((point) => point.y)
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
      const livePoint = findLivePoint(categories, line.data)
      const shouldShowArea = stacked || showArea
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
      const areaOpacity =
        areaFromColor || areaToColor ? 1 : SANDBOX_MONITORING_CHART_AREA_OPACITY

      const seriesItem: SeriesOption = {
        id: line.id,
        name: line.name,
        type: 'line',
        symbol: 'none',
        showSymbol: false,
        smooth: false,
        emphasis: {
          disabled: true,
        },
        stack: stacked ? SANDBOX_MONITORING_CHART_STACK_ID : undefined,
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
        data: line.data.map((point) => point.y ?? '-'),
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
        top: 10,
        bottom: showXAxisLabels ? 24 : 10,
        left: 36,
        right: 8,
      },
      xAxis: {
        type: 'category',
        data: categories,
        boundaryGap: false,
        axisLine: { show: true, lineStyle: { color: stroke } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          show: showXAxisLabels,
          color: fgTertiary,
          fontFamily: fontMono,
          fontSize: SANDBOX_MONITORING_CHART_AXIS_LABEL_FONT_SIZE,
          hideOverlap: true,
          formatter: formatXAxisLabel,
        },
        axisPointer: {
          show: true,
          type: 'line',
          lineStyle: {
            color: stroke,
            type: 'solid',
            width: SANDBOX_MONITORING_CHART_LINE_WIDTH,
          },
          snap: false,
          label: {
            backgroundColor: 'transparent',
            formatter: handleAxisPointer,
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
    categories,
    cssVars,
    fgTertiary,
    fontMono,
    handleAxisPointer,
    series,
    showXAxisLabels,
    showArea,
    stacked,
    stroke,
    yAxisFormatter,
    yAxisMax,
  ])

  return (
    <ReactEChartsCore
      key={resolvedTheme}
      echarts={echarts}
      option={option}
      style={{ width: '100%', height: '100%' }}
      onChartReady={handleChartReady}
      className={className}
      onEvents={{
        globalout: handleGlobalOut,
        brushEnd: handleBrushEnd,
      }}
    />
  )
}

const MemoizedSandboxMetricsChart = memo(SandboxMetricsChart)

MemoizedSandboxMetricsChart.displayName = 'SandboxMetricsChart'

export default MemoizedSandboxMetricsChart
