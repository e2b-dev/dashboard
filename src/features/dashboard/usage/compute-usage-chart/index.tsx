'use client'

import { useCssVars } from '@/lib/hooks/use-css-vars'
import { buildSeriesData, calculateYAxisMax } from '@/lib/utils/chart'
import { EChartsOption, SeriesOption } from 'echarts'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import { BarChart } from 'echarts/charts'
import {
  BrushComponent,
  GridComponent,
  ToolboxComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useTheme } from 'next-themes'
import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { COMPUTE_CHART_CONFIGS } from '../constants'
import { normalizeToStartOfSamplingPeriod } from '../sampling-utils'
import type { ComputeUsageChartProps } from './types'
import { formatAxisDate, transformComputeData } from './utils'

echarts.use([
  BarChart,
  GridComponent,
  TooltipComponent,
  BrushComponent,
  CanvasRenderer,
  ToolboxComponent,
])

function ComputeUsageChart({
  startTime,
  endTime,
  type,
  data,
  samplingMode,
  className,
  onHover,
  onHoverEnd,
  onBrushEnd,
}: ComputeUsageChartProps) {
  const chartRef = useRef<ReactEChartsCore | null>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const { resolvedTheme } = useTheme()

  const onHoverRef = useRef(onHover)
  const onHoverEndRef = useRef(onHoverEnd)
  const onBrushEndRef = useRef(onBrushEnd)

  onHoverRef.current = onHover
  onHoverEndRef.current = onHoverEnd
  onBrushEndRef.current = onBrushEnd

  const config = COMPUTE_CHART_CONFIGS[type]

  const chartData = useMemo(() => transformComputeData(data), [data])

  const cssVars = useCssVars([
    config.barColorVar,
    '--stroke',
    '--fg-tertiary',
    '--bg-inverted',
    '--font-mono',
  ] as const)

  const barColor = cssVars[config.barColorVar] || '#000'
  const stroke = cssVars['--stroke'] || '#000'
  const fgTertiary = cssVars['--fg-tertiary'] || '#666'
  const bgInverted = cssVars['--bg-inverted'] || '#fff'
  const fontMono = cssVars['--font-mono'] || 'monospace'

  const handleAxisPointer = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (params: any) => {
      const timestamp = params.value

      if (timestamp && onHoverRef.current) {
        onHoverRef.current(timestamp)
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

          const normalizedStart = normalizeToStartOfSamplingPeriod(
            Math.round(startValue),
            samplingMode
          )
          const normalizedEnd = normalizeToStartOfSamplingPeriod(
            Math.round(endValue),
            samplingMode
          )

          onBrushEndRef.current(normalizedStart, normalizedEnd)

          chartInstanceRef.current?.dispatchAction({
            type: 'brush',
            command: 'clear',
            areas: [],
          })
        }
      }
    },
    [samplingMode]
  )

  const handleChartReady = useCallback((chart: echarts.ECharts) => {
    chartInstanceRef.current = chart

    // activate brush selection mode
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

  const option = useMemo<EChartsOption>(() => {
    const yAxisMax = calculateYAxisMax(chartData, config.yAxisScaleFactor)
    const seriesData = buildSeriesData(chartData)

    // calculate tick interval based on sampling mode
    const HOUR_MS = 60 * 60 * 1000
    const DAY_MS = 24 * HOUR_MS
    const WEEK_MS = 7 * DAY_MS

    let minInterval: number
    if (samplingMode === 'hourly') {
      minInterval = HOUR_MS
    } else if (samplingMode === 'weekly') {
      minInterval = WEEK_MS
    } else {
      minInterval = DAY_MS
    }

    const seriesItem: SeriesOption = {
      id: config.id,
      name: config.name,
      type: 'bar',
      itemStyle: {
        color: 'transparent',
        borderColor: barColor,
        borderWidth: 0.3,
        borderCap: 'square',
        opacity: 1,
        decal: {
          symbol: 'line',
          symbolSize: 1.5,
          rotation: -Math.PI / 4,
          dashArrayX: [1, 0],
          dashArrayY: [2, 4],
          color: barColor,
        },
      },
      barCategoryGap: 3,
      emphasis: {
        itemStyle: {
          opacity: 1,
        },
      },
      data: seriesData.map((d) => d.value),
    }

    const series: EChartsOption['series'] = [seriesItem]

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
          color: bgInverted,
          opacity: 0.2,
          borderType: 'solid',
          borderWidth: 1,
          borderColor: bgInverted,
        },
        outOfBrush: {
          color: 'transparent',
        },
      },
      grid: {
        top: 10,
        bottom: 20,
        left: 0,
        right: 0,
      },
      xAxis: {
        type: 'value',
        minInterval,
        axisPointer: {
          show: true,
          type: 'line',
          lineStyle: { color: stroke, type: 'solid', width: 1 },
          snap: false,
          label: {
            backgroundColor: 'transparent',
            // only to get currently axis value
            formatter: handleAxisPointer,
          },
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
          showMinLabel: true,
          showMaxLabel: true,
          formatter: (value: number) => {
            return formatAxisDate(value)
          },
          alignMaxLabel: 'right',
          alignMinLabel: 'left',
        },
        // show no tick in-between, only start and end
        interval: Number.MAX_SAFE_INTEGER,
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: yAxisMax,
        interval: yAxisMax / 2,
        axisLine: {
          show: false,
        },
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
          fontSize: 12,
          interval: 0,
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
    samplingMode,
    barColor,
    bgInverted,
    stroke,
    fgTertiary,
    fontMono,
    handleAxisPointer,
  ])

  useEffect(() => {
    const chart = chartInstanceRef.current

    if (chart) {
      chart.setOption({
        xAxis: {
          min: startTime,
          max: endTime,
        },
      })
    }
  }, [option, startTime, endTime])

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

const MemoizedComputeUsageChart = memo(
  ComputeUsageChart,
  (prevProps, nextProps) => {
    return (
      prevProps.type === nextProps.type &&
      prevProps.data === nextProps.data &&
      prevProps.samplingMode === nextProps.samplingMode &&
      prevProps.className === nextProps.className &&
      prevProps.startTime === nextProps.startTime &&
      prevProps.endTime === nextProps.endTime
      // exclude onHover and onHoverEnd - they're handled via refs
    )
  }
)

MemoizedComputeUsageChart.displayName = 'ComputeUsageChart'

export default MemoizedComputeUsageChart
