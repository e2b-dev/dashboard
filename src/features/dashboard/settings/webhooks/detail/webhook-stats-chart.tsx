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
import { memo, useEffect, useMemo, useRef } from 'react'
import { useCssVars } from '@/lib/hooks/use-css-vars'
import { cn } from '@/lib/utils'
import { calculateAxisMax } from '@/lib/utils/chart'
import { formatDisplayTimestamp } from '@/lib/utils/formatting'

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
  xAxisScale?: 'daily' | 'four-hour' | 'twelve-hour' | 'today'
  xAxisMax?: number
  xAxisMin?: number
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

const formatAxisLabel = (
  value: number,
  scale: NonNullable<WebhookStatsChartProps['xAxisScale']>,
  bounds: Pick<WebhookStatsChartProps, 'xAxisMax' | 'xAxisMin'>
) => {
  const date = new Date(value)

  if (scale === 'daily') {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  const isWholeHour =
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0
  if (!isWholeHour) return ''
  if (bounds.xAxisMin && value < bounds.xAxisMin) return ''
  if (bounds.xAxisMax && value >= bounds.xAxisMax) return ''
  if (scale === 'twelve-hour' && bounds.xAxisMin) {
    const firstWholeHour = Math.ceil(bounds.xAxisMin / HOUR_MS) * HOUR_MS
    if ((value - firstWholeHour) % (2 * HOUR_MS) !== 0) return ''
  }

  return date
    .toLocaleTimeString('en-US', { hour: 'numeric' })
    .replace(/\s/g, '')
}

const getXAxisInterval = ({
  scale,
  xAxisMax,
  xAxisMin,
}: Pick<WebhookStatsChartProps, 'xAxisMax' | 'xAxisMin'> & {
  scale: NonNullable<WebhookStatsChartProps['xAxisScale']>
}) => {
  if (scale === 'daily') return DAY_MS
  if (scale === 'four-hour') return HOUR_MS
  if (scale === 'twelve-hour') return 2 * HOUR_MS
  if (!xAxisMin || !xAxisMax) return 2 * HOUR_MS

  const rangeMs = xAxisMax - xAxisMin
  if (rangeMs <= 6 * HOUR_MS) return HOUR_MS
  if (rangeMs <= 12 * HOUR_MS) return 2 * HOUR_MS

  return 4 * HOUR_MS
}

const defaultValueFormatter = (value: number) => value.toLocaleString()

const formatTooltipTimestamp = (
  timestampMs: number,
  scale: NonNullable<WebhookStatsChartProps['xAxisScale']>
) => {
  if (scale !== 'daily') return formatDisplayTimestamp(timestampMs)

  const date = new Date(timestampMs)
  const now = new Date()
  const yesterday = new Date()
  yesterday.setDate(now.getDate() - 1)

  if (date.toDateString() === now.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return date.toLocaleDateString('en-US', { weekday: 'long' })
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
  xAxisScale = 'daily',
  xAxisMax,
  xAxisMin,
}: WebhookStatsChartProps) {
  const chartRef = useRef<ReactEChartsCore | null>(null)
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
    const xAxisInterval = getXAxisInterval({
      scale: xAxisScale,
      xAxisMax,
      xAxisMin,
    })

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
        <div>${formatTooltipTimestamp(timestampMs, xAxisScale)}</div>
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
        interval: xAxisInterval,
        boundaryGap: [0, 0],
        axisLine: { show: true, lineStyle: { color: stroke } },
        axisTick: { show: false },
        axisLabel: {
          color: fgTertiary,
          fontFamily: fontMono,
          fontSize: 12,
          hideOverlap: true,
          formatter: (value: number) =>
            formatAxisLabel(value, xAxisScale, { xAxisMax, xAxisMin }),
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
    xAxisScale,
    xAxisMax,
    xAxisMin,
  ])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      chartRef.current?.getEchartsInstance().resize()
    })

    return () => cancelAnimationFrame(frame)
  })

  return (
    <div className={cn('h-full min-h-[260px] min-w-0 w-full', className)}>
      <ReactEChartsCore
        ref={chartRef}
        key={resolvedTheme}
        echarts={echarts}
        option={option}
        notMerge
        lazyUpdate={false}
        style={{ width: '100%', height: '100%' }}
        className="h-full w-full cursor-crosshair"
      />
    </div>
  )
})

export {
  WebhookStatsChart,
  type WebhookStatsChartPoint,
  type WebhookStatsChartSeries,
}
