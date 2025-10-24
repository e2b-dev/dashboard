'use client'

import { useCssVars } from '@/lib/hooks/use-css-vars'
import { EChartsOption, SeriesOption } from 'echarts'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import { LineChart } from 'echarts/charts'
import {
  BrushComponent,
  GridComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useTheme } from 'next-themes'
import { memo, useCallback, useMemo, useRef } from 'react'
import { COMPUTE_CHART_CONFIGS } from './constants'
import type { ComputeUsageChartProps } from './types'
import {
  buildSeriesData,
  calculateYAxisMax,
  transformComputeData,
} from './utils'

// Register echarts components
echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  BrushComponent,
  CanvasRenderer,
])

/**
 * Normalize timestamp to start of day (00:00:00)
 */
function normalizeToStartOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/**
 * Normalize timestamp to end of day (23:59:59.999)
 */
function normalizeToEndOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(23, 59, 59, 999)
  return date.getTime()
}

/**
 * Generic compute usage chart component for cost, RAM, and vCPU metrics
 * Uses ECharts with line step visualization
 */
function ComputeUsageChart({
  type,
  data,
  className,
  onTooltipValueChange,
  onHoverEnd,
  onBrushEnd,
}: ComputeUsageChartProps) {
  const chartRef = useRef<ReactEChartsCore | null>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const { resolvedTheme } = useTheme()

  // Use refs for callbacks to avoid re-creating chart options
  const onTooltipValueChangeRef = useRef(onTooltipValueChange)
  const onHoverEndRef = useRef(onHoverEnd)
  const onBrushEndRef = useRef(onBrushEnd)

  // Keep refs up to date
  onTooltipValueChangeRef.current = onTooltipValueChange
  onHoverEndRef.current = onHoverEnd
  onBrushEndRef.current = onBrushEnd

  const config = COMPUTE_CHART_CONFIGS[type]

  // Transform data once
  const chartData = useMemo(() => transformComputeData(data), [data])

  // Get CSS vars - automatically updates on theme change
  const cssVars = useCssVars([
    config.barColorVar,
    config.areaFromVar,
    config.areaToVar,
    '--stroke',
    '--fg-tertiary',
    '--bg-inverted',
    '--font-mono',
  ] as const)

  const barColor = cssVars[config.barColorVar] || '#000'
  const areaFrom = cssVars[config.areaFromVar] || '#000'
  const areaTo = cssVars[config.areaToVar] || '#000'
  const stroke = cssVars['--stroke'] || '#000'
  const fgTertiary = cssVars['--fg-tertiary'] || '#666'
  const bgInverted = cssVars['--bg-inverted'] || '#fff'
  const fontMono = cssVars['--font-mono'] || 'monospace'

  // Tooltip formatter that extracts data and calls onTooltipValueChange
  const tooltipFormatter = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (params: any) => {
      const paramArray = Array.isArray(params) ? params : [params]

      if (paramArray.length > 0 && paramArray[0]?.value) {
        const [timestamp] = paramArray[0].value

        if (onTooltipValueChangeRef.current && timestamp !== undefined) {
          onTooltipValueChangeRef.current(timestamp)
        }
      }

      return ''
    },
    []
  )

  const handleGlobalOut = useCallback(() => {
    if (onHoverEndRef.current) {
      onHoverEndRef.current()
    }
  }, [])

  const handleBrushEnd = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (params: any) => {
      const areas = params.areas
      if (areas && areas.length > 0) {
        const area = areas[0]
        const coordRange = area.coordRange

        if (coordRange && coordRange.length === 2 && onBrushEndRef.current) {
          const startValue = coordRange[0]
          const endValue = coordRange[1]

          const normalizedStart = normalizeToStartOfDay(Math.round(startValue))
          const normalizedEnd = normalizeToEndOfDay(Math.round(endValue))

          onBrushEndRef.current(normalizedStart, normalizedEnd)

          chartInstanceRef.current?.dispatchAction({
            type: 'brush',
            command: 'clear',
            areas: [],
          })
        }
      }
    },
    []
  )

  const handleChartReady = useCallback((chart: echarts.ECharts) => {
    chartInstanceRef.current = chart

    // activates brush selection mode
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

    chart.group = 'usage'
    echarts.connect('usage')
  }, [])

  // builds complete echarts option once
  const option = useMemo<EChartsOption>(() => {
    const yAxisMax = calculateYAxisMax(chartData, config.yAxisScaleFactor)
    const seriesData = buildSeriesData(chartData)

    const seriesItem: SeriesOption = {
      id: config.id,
      name: config.name,
      type: 'line',
      step: 'middle',
      smooth: false,
      symbol: 'rect',
      symbolSize: 0,
      showSymbol: false,
      showAllSymbol: false,
      lineStyle: {
        width: 1,
        color: barColor,
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: areaFrom },
            { offset: 1, color: areaTo },
          ],
        },
      },
      emphasis: {
        scale: true,
        itemStyle: {
          borderWidth: 2,
          borderColor: barColor,
        },
      },
      data: seriesData.map((d) => d.value),
    }

    const series: EChartsOption['series'] = [seriesItem]

    const xMin = chartData.length > 0 ? chartData[0]!.x : Date.now()
    const xMax =
      chartData.length > 0 ? chartData[chartData.length - 1]!.x : Date.now()

    return {
      backgroundColor: 'transparent',
      animation: false,
      brush: {
        brushType: 'lineX',
        brushMode: 'single',
        xAxisIndex: 0,
        brushLink: 'all',
        brushStyle: {
          color: bgInverted,
          opacity: 0.2,
          borderType: 'solid',
          borderWidth: 1,
          borderColor: bgInverted,
        },
      },
      grid: {
        top: 10,
        right: 5,
        bottom: 20,
        left: 50,
      },
      tooltip: {
        show: true,
        trigger: 'axis',
        transitionDuration: 0,
        enterable: false,
        hideDelay: 0,
        // Render tooltip invisible - used only for value extraction
        backgroundColor: 'transparent',
        borderWidth: 0,
        textStyle: { fontSize: 0, color: 'transparent' },
        formatter: tooltipFormatter,
        // Position off-screen
        position: [-9999, -9999],
      },
      xAxis: {
        type: 'time',
        min: xMin,
        max: xMax,
        axisPointer: {
          show: true,
          type: 'line',
          lineStyle: { color: stroke, type: 'solid', width: 1 },
          triggerTooltip: true,
          snap: false,
        },
        axisLine: {
          show: true,
          lineStyle: { color: stroke },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          show: true,
          color: fgTertiary,
          fontFamily: fontMono,
          fontSize: 12,
          hideOverlap: true,
          formatter: {
            year: '{yyyy}',
            month: '{MMM} {d}',
            day: '{MMM} {d}',
            hour: '{HH}:{mm}',
            minute: '{HH}:{mm}',
            second: '{HH}:{mm}:{ss}',
          },
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: yAxisMax,
        interval: yAxisMax / 2, // Creates lines at 0%, 50%, 100%
        axisLine: {
          show: false,
        },
        axisTick: { show: false },
        splitLine: {
          show: true,
          lineStyle: { color: stroke, type: 'dashed' },
          interval: 0, // Show all split lines (at 0, 50%, 100%)
        },
        axisLabel: {
          show: true,
          color: fgTertiary,
          fontFamily: fontMono,
          fontSize: 12,
          interval: 0, // Show all labels (at 0, 50%, 100%)
          formatter: config.yAxisFormatter,
        },
        axisPointer: {
          show: false,
        },
      },
      series,
    }
  }, [
    chartData,
    config,
    tooltipFormatter,
    barColor,
    areaFrom,
    areaTo,
    bgInverted,
    stroke,
    fgTertiary,
    fontMono,
  ])

  return (
    <ReactEChartsCore
      ref={chartRef}
      key={resolvedTheme}
      echarts={echarts}
      option={option}
      notMerge={false}
      lazyUpdate={false}
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

// Memoize to prevent unnecessary re-renders
const MemoizedComputeUsageChart = memo(
  ComputeUsageChart,
  (prevProps, nextProps) => {
    return (
      prevProps.type === nextProps.type &&
      prevProps.data === nextProps.data &&
      prevProps.className === nextProps.className
      // Explicitly exclude onTooltipValueChange and onHoverEnd from comparison
      // They are handled via refs internally
    )
  }
)

MemoizedComputeUsageChart.displayName = 'ComputeUsageChart'

export default MemoizedComputeUsageChart

// Export utilities
export { COMPUTE_CHART_CONFIGS } from './constants'
export type { ComputeChartType, ComputeUsageChartProps } from './types'
export { transformComputeData } from './utils'
