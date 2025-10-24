'use client'

import { useCssVars } from '@/lib/hooks/use-css-vars'
import { EChartsOption, SeriesOption } from 'echarts'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useTheme } from 'next-themes'
import { memo, useCallback, useMemo, useRef } from 'react'
import { COMPUTE_CHART_CONFIGS, STATIC_ECHARTS_CONFIG } from './constants'
import type { ComputeUsageChartProps } from './types'
import {
  buildSeriesData,
  calculateYAxisMax,
  transformComputeData,
} from './utils'

// Register echarts components
echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

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
}: ComputeUsageChartProps) {
  const chartRef = useRef<ReactEChartsCore | null>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const { resolvedTheme } = useTheme()

  // Use refs for callbacks to avoid re-creating chart options
  const onTooltipValueChangeRef = useRef(onTooltipValueChange)
  const onHoverEndRef = useRef(onHoverEnd)

  // Keep refs up to date
  onTooltipValueChangeRef.current = onTooltipValueChange
  onHoverEndRef.current = onHoverEnd

  const config = COMPUTE_CHART_CONFIGS[type]

  // Transform data once
  const chartData = useMemo(
    () => transformComputeData(data, config.valueKey),
    [data, config.valueKey]
  )

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

  // Chart ready handler
  const handleChartReady = useCallback((chart: echarts.ECharts) => {
    chartInstanceRef.current = chart

    chart.group = 'usage'
    echarts.connect('usage')
  }, [])

  // Build complete echarts option once
  const option = useMemo<EChartsOption>(() => {
    const yAxisMax = calculateYAxisMax(chartData, config.yAxisScaleFactor)
    const seriesData = buildSeriesData(chartData)

    // Build line step series
    const seriesItem: SeriesOption = {
      id: config.id,
      name: config.name,
      type: 'line',
      step: 'middle',
      smooth: false,
      showSymbol: false,
      symbol: 'none',
      lineStyle: {
        color: barColor,
        width: 1,
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
        lineStyle: {
          color: barColor,
          width: 1,
        },
      },
      data: seriesData.map((d) => d.value),
    }

    const series: EChartsOption['series'] = [seriesItem]

    // Calculate time bounds
    const xMin = chartData.length > 0 ? chartData[0]!.x : Date.now()
    const xMax =
      chartData.length > 0 ? chartData[chartData.length - 1]!.x : Date.now()

    return {
      ...STATIC_ECHARTS_CONFIG,
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
