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
  MarkLineComponent,
  MarkPointComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import { useTheme } from 'next-themes'
import { memo, useCallback, useMemo, useRef } from 'react'
import { useCssVars } from '@/lib/hooks/use-css-vars'
import { calculateAxisMax } from '@/lib/utils/chart'
import { CHART_CONFIGS, LIVE_PADDING_MULTIPLIER } from './constants'
import type { TeamMetricsChartProps } from './types'
import {
  buildSeriesData,
  createLimitLine,
  createLiveIndicators,
  createSplitLineInterval,
  createYAxisLabelFormatter,
  hasLiveData,
  transformMetrics,
} from './utils'

// Register only the components we use
echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  BrushComponent,
  MarkPointComponent,
  MarkLineComponent,
  AxisPointerComponent,
  CanvasRenderer,
])

/**
 * Highly optimized team metrics chart component
 * Minimizes re-renders and deep merges, builds complete ECharts config once
 */
function TeamMetricsChart({
  type,
  metrics,
  step,
  timeframe,
  className,
  concurrentLimit,
  onZoomEnd,
  onTooltipValueChange,
  onHoverEnd,
}: TeamMetricsChartProps) {
  const chartRef = useRef<ReactEChartsCore | null>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const { resolvedTheme } = useTheme()

  // use refs for callbacks to avoid re-creating chart options
  const onTooltipValueChangeRef = useRef(onTooltipValueChange)
  const onHoverEndRef = useRef(onHoverEnd)
  const onZoomEndRef = useRef(onZoomEnd)

  // keep refs up to date
  onTooltipValueChangeRef.current = onTooltipValueChange
  onHoverEndRef.current = onHoverEnd
  onZoomEndRef.current = onZoomEnd

  const config = CHART_CONFIGS[type]

  // transform data once
  const chartData = useMemo(
    () => transformMetrics(metrics, config.valueKey),
    [metrics, config.valueKey]
  )

  // get CSS vars - automatically updates on theme change
  const cssVars = useCssVars([
    config.lineColorVar,
    config.areaFromVar,
    config.areaToVar,
    '--stroke',
    '--fg-tertiary',
    '--font-mono',
    '--accent-error-highlight',
    '--accent-error-bg',
    '--bg-1',
  ] as const)

  const lineColor = cssVars[config.lineColorVar] || '#000'
  const areaFrom = cssVars[config.areaFromVar] || '#000'
  const areaTo = cssVars[config.areaToVar] || '#000'
  const stroke = cssVars['--stroke'] || '#000'
  const fgTertiary = cssVars['--fg-tertiary'] || '#666'
  const fontMono = cssVars['--font-mono'] || 'monospace'
  const errorHighlight = cssVars['--accent-error-highlight'] || '#f00'
  const errorBg = cssVars['--accent-error-bg'] || '#fee'
  const bg1 = cssVars['--bg-1'] || '#fff'

  // tooltip formatter that extracts data and calls onTooltipValueChange
  const tooltipFormatter = useCallback((params: any) => {
    // params is an array when trigger is 'axis'
    const paramArray = Array.isArray(params) ? params : [params]

    if (paramArray.length > 0 && paramArray[0]?.value) {
      const [timestamp, value] = paramArray[0].value

      if (
        onTooltipValueChangeRef.current &&
        timestamp !== undefined &&
        value !== undefined
      ) {
        onTooltipValueChangeRef.current(timestamp, value)
      }
    }

    return ''
  }, [])

  const handleBrushEnd = useCallback((params: any) => {
    const areas = params.areas
    if (areas && areas.length > 0) {
      const coordRange = areas[0].coordRange

      if (coordRange && coordRange.length === 2 && onZoomEndRef.current) {
        const startValue = Math.round(coordRange[0])
        const endValue = Math.round(coordRange[1])

        onZoomEndRef.current(startValue, endValue)

        // clears brush after selection
        chartInstanceRef.current?.dispatchAction({
          type: 'brush',
          command: 'clear',
          areas: [],
        })
      }
    }
  }, [])

  // chart ready handler - stable reference
  const handleChartReady = useCallback((chart: echarts.ECharts) => {
    chartInstanceRef.current = chart

    // Activate brush selection mode
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

    chart.group = 'sandboxes-monitoring'
    echarts.connect('sandboxes-monitoring')
  }, [])

  const handleGlobalOut = useCallback(() => {
    if (onHoverEndRef.current) {
      onHoverEndRef.current()
    }
  }, [])

  // build complete echarts option once
  const option = useMemo<EChartsOption>(() => {
    // calculate y-axis max based on data only
    const yAxisMax = calculateAxisMax(
      chartData.map((d) => d.y),
      config.yAxisScaleFactor
    )

    const seriesData = buildSeriesData(chartData)
    const isLive = hasLiveData(chartData)
    const lastPoint =
      chartData.length > 0 ? chartData[chartData.length - 1] : null

    // build series object with proper typing
    const seriesItem: SeriesOption = {
      id: config.id,
      name: config.name,
      type: 'line',
      symbol: 'rect',
      symbolSize: 0,
      showSymbol: false,
      showAllSymbol: false,
      lineStyle: {
        width: 1,
        color: lineColor,
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
          borderColor: lineColor,
        },
      },
      data: seriesData,
    }

    // add live indicators if live
    if (isLive && lastPoint) {
      seriesItem.markPoint = createLiveIndicators(
        lastPoint,
        lineColor
      ) as MarkPointComponentOption
    }

    const series: EChartsOption['series'] = [seriesItem]

    // calculate time bounds
    const xMin = chartData.length > 0 ? chartData[0]!.x : timeframe.start
    const xMax =
      chartData.length > 0
        ? chartData[chartData.length - 1]!.x +
          (timeframe.isLive ? step * LIVE_PADDING_MULTIPLIER : 0)
        : timeframe.end

    if (concurrentLimit !== undefined && concurrentLimit <= yAxisMax) {
      seriesItem.markLine = createLimitLine(concurrentLimit, {
        errorHighlightColor: errorHighlight,
        errorBgColor: errorBg,
        bg1Color: bg1,
        fontMono,
      })
    }

    // build complete option object
    return {
      backgroundColor: 'transparent',
      animation: false,
      toolbox: {
        show: false,
      },
      brush: {
        brushType: 'lineX',
        brushMode: 'single',
        xAxisIndex: 0,
        brushLink: 'all',
        brushStyle: {
          borderWidth: 1,
        },
        outOfBrush: {
          colorAlpha: 0.3,
        },
      },
      grid: {
        top: 10,
        right: 5,
        bottom: 5,
        left: 40,
      },
      tooltip: {
        show: true,
        trigger: 'axis',
        transitionDuration: 0,
        enterable: false,
        hideDelay: 0,
        // render tooltip invisible - used only for value extraction
        backgroundColor: 'transparent',
        borderWidth: 0,
        textStyle: { fontSize: 0, color: 'transparent' },
        formatter: tooltipFormatter,
        // position off-screen
        position: [-9999, -9999],
      },
      xAxis: {
        type: 'time',
        min: xMin,
        max: xMax,
        axisLine: {
          show: false,
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
          rotate: 0,
          formatter: {
            year: '{yyyy}',
            month: '{MMM} {d}',
            day: '{MMM} {d}',
            hour: '{HH}:{mm}',
            minute: '{HH}:{mm}',
            second: '{HH}:{mm}:{ss}',
          },
        },
        axisPointer: {
          show: true,
          type: 'shadow',
          lineStyle: { color: stroke },
          triggerTooltip: false,
          snap: false,
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: yAxisMax,
        interval: yAxisMax / 2, // creates lines at 0%, 50%, 100%
        axisLine: {
          show: false,
          lineStyle: { color: stroke },
        },
        axisTick: { show: false },
        splitLine: {
          show: true,
          lineStyle: { color: stroke, type: 'dashed' },
          interval:
            concurrentLimit !== undefined && concurrentLimit <= yAxisMax
              ? createSplitLineInterval(concurrentLimit)
              : 0, // 0 means show all split lines (at 0, 50%, 100%)
        },
        axisLabel: {
          show: true,
          color: fgTertiary,
          fontFamily: fontMono,
          fontSize: 14,
          interval: 0, // show all labels (at 0, 50%, 100%)
          formatter: createYAxisLabelFormatter(
            concurrentLimit !== undefined && concurrentLimit <= yAxisMax
              ? concurrentLimit
              : undefined,
            yAxisMax
          ),
          overflow: 'truncate',
          ellipsis: '…',
          width: 40,
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
    concurrentLimit,
    step,
    timeframe,
    tooltipFormatter,
    lineColor,
    areaFrom,
    areaTo,
    stroke,
    fgTertiary,
    fontMono,
    errorHighlight,
    errorBg,
    bg1,
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
        brushEnd: handleBrushEnd,
        globalout: handleGlobalOut,
      }}
    />
  )
}

// memoize component to prevent re-renders when parent re-renders
// only re-render if actual props change
const MemoizedTeamMetricsChart = memo(
  TeamMetricsChart,
  (prevProps, nextProps) => {
    return (
      prevProps.type === nextProps.type &&
      prevProps.metrics === nextProps.metrics &&
      prevProps.step === nextProps.step &&
      prevProps.timeframe.start === nextProps.timeframe.start &&
      prevProps.timeframe.end === nextProps.timeframe.end &&
      prevProps.timeframe.isLive === nextProps.timeframe.isLive &&
      prevProps.concurrentLimit === nextProps.concurrentLimit &&
      prevProps.className === nextProps.className
      // explicitly exclude onTooltipValueChange and onHoverEnd from comparison
      // they are handled via refs internally
    )
  }
)

MemoizedTeamMetricsChart.displayName = 'TeamMetricsChart'

export default MemoizedTeamMetricsChart

// export utilities for use in parent components
export { CHART_CONFIGS } from './constants'
export type { ChartType, TeamMetricsChartProps } from './types'
export { transformMetrics } from './utils'
