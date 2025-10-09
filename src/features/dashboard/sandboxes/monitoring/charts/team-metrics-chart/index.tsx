'use client'

import { useCssVars } from '@/lib/hooks/use-css-vars'
import { createSingleValueTooltipFormatter } from '@/lib/utils/chart'
import {
  formatChartTimestampLocal,
  formatTimeAxisLabel,
} from '@/lib/utils/formatting'
import { format } from 'date-fns'
// Import the echarts core module
import { EChartsOption } from 'echarts'
import * as echarts from 'echarts/core'
// Import only the charts we need
import { LineChart } from 'echarts/charts'
// Import only the components we need
import {
  AxisPointerComponent,
  DataZoomComponent,
  GridComponent,
  MarkLineComponent,
  MarkPointComponent,
  ToolboxComponent,
  TooltipComponent,
} from 'echarts/components'
// Import canvas renderer
import { CanvasRenderer } from 'echarts/renderers'
// Import core ReactECharts for tree-shaking
import ReactEChartsCore from 'echarts-for-react/lib/core'
import { useTheme } from 'next-themes'
import { useCallback, useMemo, useRef } from 'react'
import {
  AXIS_SPLIT_NUMBER,
  CHART_CONFIGS,
  LIVE_PADDING_MULTIPLIER,
  STATIC_ECHARTS_CONFIG,
} from './constants'
import type { TeamMetricsChartProps } from './types'
import {
  buildSeriesData,
  calculateYAxisMax,
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
  ToolboxComponent,
  DataZoomComponent,
  MarkPointComponent,
  MarkLineComponent,
  AxisPointerComponent,
  CanvasRenderer,
])

/**
 * Create x-axis label formatter
 */
function createXAxisFormatter() {
  return (value: string | number): string => {
    const date = new Date(value)
    const isNewDay = date.getHours() === 0 && date.getMinutes() === 0

    const width = window.innerWidth

    if (width < 768) {
      return isNewDay ? format(date, 'MMM d') : format(date, 'HH:mm')
    } else if (width < 1024) {
      return isNewDay ? format(date, 'MMM d') : format(date, 'h:mm a')
    } else if (width < 1280) {
      return isNewDay ? format(date, 'MMM d') : format(date, 'h:mm a')
    }

    return formatTimeAxisLabel(value, isNewDay)
  }
}

/**
 * Highly optimized team metrics chart component
 * Minimizes re-renders and deep merges, builds complete ECharts config once
 */
export default function TeamMetricsChart({
  type,
  metrics,
  step,
  timeframe,
  className,
  concurrentLimit,
  onZoomEnd,
}: TeamMetricsChartProps) {
  const chartRef = useRef<ReactEChartsCore | null>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const { resolvedTheme } = useTheme()

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
    '--fg',
    '--bg-inverted',
    '--bg-highlight',
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
  const fg = cssVars['--fg'] || '#000'
  const bgInverted = cssVars['--bg-inverted'] || '#fff'
  const bgHighlight = cssVars['--bg-highlight'] || '#f0f0f0'
  const fontMono = cssVars['--font-mono'] || 'monospace'
  const errorHighlight = cssVars['--accent-error-highlight'] || '#f00'
  const errorBg = cssVars['--accent-error-bg'] || '#fee'
  const bg1 = cssVars['--bg-1'] || '#fff'

  // tooltip formatter (stable reference)
  const tooltipFormatter = useMemo(
    () =>
      createSingleValueTooltipFormatter({
        step,
        label: config.tooltipLabel,
        valueClassName: config.tooltipValueClass,
      }),
    [step, config.tooltipLabel, config.tooltipValueClass]
  )

  // zoom handler
  const handleZoom = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (params: any) => {
      if (onZoomEnd && params.batch?.[0]) {
        const { startValue, endValue } = params.batch[0]
        if (startValue !== undefined && endValue !== undefined) {
          onZoomEnd(Math.round(startValue), Math.round(endValue))
        }
      }
    },
    [onZoomEnd]
  )

  // chart ready handler
  const handleChartReady = useCallback((chart: echarts.ECharts) => {
    chartInstanceRef.current = chart

    // activate datazoom
    chart.dispatchAction(
      {
        type: 'takeGlobalCursor',
        key: 'dataZoomSelect',
        dataZoomSelectActive: true,
      },
      { flush: true }
    )

    // set group for syncing
    chart.group = 'sandboxes-monitoring'
    // setTimeout(() => {
    //   echarts.connect('sandboxes-monitoring')
    // }, 0)
  }, [])

  // build complete echarts option once
  const option = useMemo<EChartsOption>(() => {
    const yAxisMax = calculateYAxisMax(
      chartData,
      config.yAxisScaleFactor,
      concurrentLimit
    )

    const seriesData = buildSeriesData(chartData)
    const isLive = hasLiveData(chartData)
    const lastPoint =
      chartData.length > 0 ? chartData[chartData.length - 1] : null

    // build series object with proper typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seriesItem: any = {
      id: config.id,
      name: config.name,
      type: 'line',
      symbol: 'circle',
      symbolSize: 0,
      showSymbol: false,
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
      seriesItem.markPoint = createLiveIndicators(lastPoint, lineColor)
    }

    // add limit line if present
    if (concurrentLimit !== undefined) {
      seriesItem.markLine = createLimitLine(concurrentLimit, {
        errorHighlightColor: errorHighlight,
        errorBgColor: errorBg,
        bg1Color: bg1,
        fontMono,
      })
    }

    const series: EChartsOption['series'] = [seriesItem]

    // calculate time bounds
    const xMin = chartData.length > 0 ? chartData[0]!.x : timeframe.start
    const xMax =
      chartData.length > 0
        ? chartData[chartData.length - 1]!.x +
          (timeframe.isLive ? step * LIVE_PADDING_MULTIPLIER : 0)
        : timeframe.end

    // build complete option object
    return {
      ...STATIC_ECHARTS_CONFIG,
      grid: {
        top: 0,
        right: 5,
        bottom: 0,
        left: 40,
      },
      tooltip: {
        show: true,
        trigger: 'axis',
        triggerOn: 'mousemove|click',
        confine: true,
        transitionDuration: 0.2,
        enterable: false,
        hideDelay: 0,
        backgroundColor: 'transparent',
        padding: 0,
        borderWidth: 0,
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: 'transparent',
        textStyle: { color: fg },
        formatter: tooltipFormatter,
      },
      xAxis: {
        type: 'time',
        min: xMin,
        max: xMax,
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
          rotate: 0,
          formatter: createXAxisFormatter(),
        },
        axisPointer: {
          show: true,
          type: 'line',
          lineStyle: {
            color: bgInverted,
            type: 'dashed',
          },
          label: {
            textMargin: [4, 0],
            show: true,
            backgroundColor: bgHighlight,
            color: fg,
            fontFamily: fontMono,
            borderRadius: 0,
            fontSize: 12,
            formatter: (params: { value: unknown }) =>
              formatChartTimestampLocal(params.value as string | number),
          },
          snap: true,
        },
      },
      yAxis: {
        type: 'value',
        splitNumber: AXIS_SPLIT_NUMBER,
        max: yAxisMax,
        axisLine: {
          show: false,
          lineStyle: { color: stroke },
        },
        axisTick: { show: false },
        splitLine: {
          show: true,
          lineStyle: { color: stroke, type: 'dashed' },
          interval: createSplitLineInterval(concurrentLimit),
        },
        axisLabel: {
          show: true,
          color: fgTertiary,
          fontFamily: fontMono,
          fontSize: 14,
          formatter: createYAxisLabelFormatter(concurrentLimit),
          overflow: 'truncate',
          ellipsis: '…',
          width: 40,
        },
        axisPointer: {
          show: false,
          lineStyle: {
            color: bgInverted,
            type: 'dashed',
          },
          label: {
            show: true,
            backgroundColor: bgHighlight,
            color: fg,
            fontFamily: fontMono,
            position: 'top',
            borderRadius: 0,
            fontSize: 14,
          },
          snap: false,
        },
      },
      toolbox: {
        ...STATIC_ECHARTS_CONFIG.toolbox,
        feature: {
          dataZoom: {
            yAxisIndex: 'none',
            brushStyle: {
              // background with 0.2 opacity
              color: bgInverted,
              opacity: 0.2,
              borderType: 'solid',
              borderWidth: 1,
              borderColor: bgInverted,
            },
          },
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
    fg,
    bgInverted,
    bgHighlight,
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
      notMerge={true}
      lazyUpdate={true}
      style={{ width: '100%', height: '100%' }}
      onChartReady={handleChartReady}
      className={className}
      onEvents={{
        datazoom: handleZoom,
      }}
    />
  )
}

// export utilities for use in parent components
export { CHART_CONFIGS } from './constants'
export type { ChartType, TeamMetricsChartProps } from './types'
export { calculateCentralTendency, transformMetrics } from './utils'
