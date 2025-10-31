'use client'

import { useCssVars } from '@/lib/hooks/use-css-vars'
import { calculateAxisMax } from '@/lib/utils/chart'
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
import { memo, useCallback, useMemo, useRef } from 'react'
import { COMPUTE_CHART_CONFIGS } from '../constants'
import type { ComputeUsageChartProps } from './types'

echarts.use([
  BarChart,
  GridComponent,
  TooltipComponent,
  BrushComponent,
  CanvasRenderer,
  ToolboxComponent,
])

function ComputeUsageChart({
  type,
  data,
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
      const index = params.seriesData[0].dataIndex

      if (index !== undefined && onHoverRef.current) {
        onHoverRef.current(index)
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
          const startIndex = coordRange[0]
          const endIndex = coordRange[1]

          onBrushEndRef.current(startIndex, endIndex)

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
    const yAxisMax = calculateAxisMax(
      data.map((d) => d.y),
      config.yAxisScaleFactor
    )

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
      barCategoryGap: '15%',
      emphasis: {
        itemStyle: {
          opacity: 1,
        },
      },
      data: data.map((d) => d.y),
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
      xAxis: [
        {
          type: 'category',
          data: data.map((d) => d.x),
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
            formatter: (value: string, index: number) => {
              // Only show labels for first and last data points
              if (index === 0 || index === data.length - 1) {
                return value
              }
              return ''
            },
          },
        },
      ],
      yAxis: [
        {
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
      ],
      series,
    }
  }, [
    data,
    config,
    barColor,
    bgInverted,
    stroke,
    fgTertiary,
    fontMono,
    handleAxisPointer,
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

const MemoizedComputeUsageChart = memo(
  ComputeUsageChart,
  (prevProps, nextProps) => {
    return (
      prevProps.type === nextProps.type &&
      prevProps.data === nextProps.data &&
      prevProps.samplingMode === nextProps.samplingMode &&
      prevProps.className === nextProps.className
      // exclude onHover and onHoverEnd - they're handled via refs
    )
  }
)

MemoizedComputeUsageChart.displayName = 'ComputeUsageChart'

export default MemoizedComputeUsageChart
