'use client'

import type { EChartsOption, SeriesOption } from 'echarts'
import { LineChart, ScatterChart } from 'echarts/charts'
import {
  AxisPointerComponent,
  GridComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import { useTheme } from 'next-themes'
import { memo, useMemo } from 'react'
import { useCssVars } from '@/lib/hooks/use-css-vars'
import { cn } from '@/lib/utils'
import { calculateAxisMax } from '@/lib/utils/chart'

echarts.use([
  LineChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  AxisPointerComponent,
  SVGRenderer,
])

type WebhookStatsChartPoint = {
  timestamp: string
  value: number | null
}

type WebhookStatsChartSeries = {
  name: string
  data: WebhookStatsChartPoint[]
  connectNulls?: boolean
  showSymbol?: boolean
  z?: number
  colorVar:
    | '--accent-info-highlight'
    | '--accent-error-highlight'
    | '--accent-positive-highlight'
    | '--fg-tertiary'
}

type WebhookStatsChartProps = {
  series: WebhookStatsChartSeries[]
  chartType?: 'line' | 'scatter'
  className?: string
  valueFormatter?: (value: number) => string
  xAxisMax?: number
  xAxisMin?: number
}

const formatAxisLabel = (value: number) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
  })

const defaultValueFormatter = (value: number) => value.toLocaleString()

const getNumericTooltipValue = (value: unknown) => {
  if (typeof value === 'number') return value

  if (!Array.isArray(value)) return null

  const yValue = value[1]

  return typeof yValue === 'number' ? yValue : null
}

const WebhookStatsChart = memo(function WebhookStatsChart({
  series,
  chartType = 'scatter',
  className,
  valueFormatter = defaultValueFormatter,
  xAxisMax,
  xAxisMin,
}: WebhookStatsChartProps) {
  const { resolvedTheme } = useTheme()
  const cssVars = useCssVars([
    '--accent-info-highlight',
    '--accent-error-highlight',
    '--accent-positive-highlight',
    '--fg-tertiary',
    '--stroke',
    '--bg-1',
    '--font-mono',
  ] as const)

  const stroke = cssVars['--stroke'] || '#d4d4d4'
  const fgTertiary = cssVars['--fg-tertiary'] || '#666'
  const bg = cssVars['--bg-1'] || '#fff'
  const fontMono = cssVars['--font-mono'] || 'monospace'

  const option = useMemo<EChartsOption>(() => {
    const values = series.flatMap((item) =>
      item.data.flatMap((point) => (point.value === null ? [] : [point.value]))
    )
    const yAxisMax = calculateAxisMax(values.length > 0 ? values : [0], 1.5)

    const chartSeries: SeriesOption[] = series.map((item) => {
      const color = cssVars[item.colorVar] || '#000'

      return {
        name: item.name,
        type: chartType,
        z: item.z,
        data: item.data.map((point) => [
          new Date(point.timestamp).getTime(),
          point.value,
        ]),
        symbol: 'circle',
        symbolSize: 7,
        showSymbol: item.showSymbol ?? chartType === 'scatter',
        connectNulls: item.connectNulls,
        itemStyle: {
          color,
        },
        lineStyle: {
          color,
          width: 2,
        },
        emphasis: {
          disabled: true,
        },
      }
    })

    return {
      backgroundColor: 'transparent',
      animation: false,
      grid: {
        top: 16,
        right: 16,
        bottom: 28,
        left: 42,
      },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: bg,
        borderColor: stroke,
        borderWidth: 1,
        textStyle: {
          color: fgTertiary,
          fontFamily: fontMono,
          fontSize: 12,
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: stroke,
            type: 'solid',
            width: 1,
          },
          label: {
            show: false,
          },
        },
        valueFormatter: (value) => {
          const numericValue = getNumericTooltipValue(value)

          return numericValue === null ? '' : valueFormatter(numericValue)
        },
      },
      xAxis: {
        type: 'time',
        min: xAxisMin,
        max: xAxisMax,
        boundaryGap: [0, 0],
        axisLine: { show: true, lineStyle: { color: stroke } },
        axisTick: { show: false },
        axisLabel: {
          color: fgTertiary,
          fontFamily: fontMono,
          fontSize: 12,
          hideOverlap: true,
          formatter: formatAxisLabel,
        },
        splitLine: { show: false },
        axisPointer: {
          show: true,
          type: 'line',
          lineStyle: {
            color: stroke,
            type: 'solid',
            width: 1,
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
        max: yAxisMax,
        interval: yAxisMax / 2,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: fgTertiary,
          fontFamily: fontMono,
          fontSize: 12,
          interval: 0,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: stroke,
            type: 'dashed',
          },
          interval: 0,
        },
        axisPointer: { show: false },
      },
      series: chartSeries,
    }
  }, [
    series,
    chartType,
    cssVars,
    stroke,
    fgTertiary,
    bg,
    fontMono,
    valueFormatter,
    xAxisMax,
    xAxisMin,
  ])

  return (
    <ReactEChartsCore
      key={resolvedTheme}
      echarts={echarts}
      option={option}
      notMerge
      lazyUpdate
      style={{ width: '100%', height: 260 }}
      className={cn('h-[260px] w-full cursor-crosshair', className)}
    />
  )
})

export {
  WebhookStatsChart,
  type WebhookStatsChartPoint,
  type WebhookStatsChartSeries,
}
