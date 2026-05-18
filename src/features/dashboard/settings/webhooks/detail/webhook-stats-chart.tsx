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
  synthetic?: boolean
  timestamp: string
  value: number | null
}

type WebhookStatsChartSeries = {
  name: string
  data: WebhookStatsChartPoint[]
  connectNulls?: boolean
  lineWidth?: number
  showSymbol?: boolean
  z?: number
  colorVar:
    | '--accent-main-highlight'
    | '--accent-info-highlight'
    | '--accent-error-highlight'
    | '--accent-positive-highlight'
    | '--accent-warning-highlight'
    | '--fg'
    | '--fg-secondary'
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

const formatTooltipTimestamp = (timestampMs: number) => {
  const date = new Date(timestampMs)
  const pad = (value: number) => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const getTooltipTimestampMs = (param: unknown) => {
  if (!param || typeof param !== 'object') return null
  if (!('value' in param)) return null
  if (!Array.isArray(param.value)) return null

  const [timestamp] = param.value
  return typeof timestamp === 'number' ? timestamp : null
}

const getTooltipSyntheticValue = (param: unknown) => {
  if (!param || typeof param !== 'object') return false
  if (!('data' in param)) return false
  if (!param.data || typeof param.data !== 'object') return false
  if (!('synthetic' in param.data)) return false

  return param.data.synthetic === true
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
    '--accent-main-highlight',
    '--accent-info-highlight',
    '--accent-error-highlight',
    '--accent-positive-highlight',
    '--accent-warning-highlight',
    '--fg',
    '--fg-secondary',
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

    const getTooltipContent = (param: unknown) => {
      if (getTooltipSyntheticValue(param)) return ''

      const timestampMs = getTooltipTimestampMs(param)
      if (timestampMs === null) return ''

      const rows = series.flatMap((item) => {
        const point = item.data.find(
          (point) =>
            !point.synthetic &&
            point.value !== null &&
            new Date(point.timestamp).getTime() === timestampMs
        )
        if (!point || point.value === null) return []

        const color = cssVars[item.colorVar] || '#000'

        return [
          `<div style="display:flex;align-items:center;gap:12px;justify-content:space-between;">
            <span style="display:inline-flex;align-items:center;gap:8px;">
              <span style="width:10px;height:10px;border-radius:9999px;background:${color};display:inline-block;"></span>
              ${item.name}
            </span>
            <strong>${valueFormatter(point.value)}</strong>
          </div>`,
        ]
      })

      if (rows.length === 0) return ''

      return `<div style="display:flex;flex-direction:column;gap:8px;">
        <div>${formatTooltipTimestamp(timestampMs)}</div>
        ${rows.join('')}
      </div>`
    }

    const chartSeries: SeriesOption[] = series.map((item) => {
      const color = cssVars[item.colorVar] || '#000'

      return {
        name: item.name,
        type: chartType,
        z: item.z,
        data: item.data.map((point) => ({
          synthetic: point.synthetic,
          value: [new Date(point.timestamp).getTime(), point.value],
        })),
        symbol: 'circle',
        symbolSize: (_value: unknown, params: unknown) =>
          getTooltipSyntheticValue(params) ? 0 : 7,
        showSymbol: item.showSymbol ?? chartType === 'scatter',
        connectNulls: item.connectNulls,
        itemStyle: {
          color,
        },
        lineStyle: {
          color,
          width: item.lineWidth ?? 2,
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
        trigger: 'item',
        confine: true,
        transitionDuration: 0,
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
        formatter: getTooltipContent,
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
