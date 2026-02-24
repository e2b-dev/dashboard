'use client'

import { useCssVars } from '@/lib/hooks/use-css-vars'
import { calculateAxisMax } from '@/lib/utils/chart'
import { formatAxisNumber } from '@/lib/utils/formatting'
import { EChartsOption, SeriesOption } from 'echarts'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import { LineChart } from 'echarts/charts'
import {
  AxisPointerComponent,
  BrushComponent,
  GridComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useTheme } from 'next-themes'
import { memo, useCallback, useMemo, useRef } from 'react'
import type { SandboxMetricsChartProps } from './types'

echarts.use([
  LineChart,
  GridComponent,
  BrushComponent,
  CanvasRenderer,
  AxisPointerComponent,
])

function SandboxMetricsChart({
  categories,
  series,
  className,
  stacked = false,
  showXAxisLabels = true,
  xAxisMin,
  xAxisMax,
  yAxisMax,
  yAxisFormatter = formatAxisNumber,
  onHover,
  onHoverEnd,
  onBrushEnd,
}: SandboxMetricsChartProps) {
  const chartRef = useRef<ReactEChartsCore | null>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const { resolvedTheme } = useTheme()

  const onHoverRef = useRef(onHover)
  const onHoverEndRef = useRef(onHoverEnd)
  const onBrushEndRef = useRef(onBrushEnd)

  onHoverRef.current = onHover
  onHoverEndRef.current = onHoverEnd
  onBrushEndRef.current = onBrushEnd

  const cssVarNames = useMemo(() => {
    const dynamicVars = series.flatMap((item) =>
      [item.lineColorVar, item.areaColorVar].filter(
        (name): name is string => Boolean(name)
      )
    )

    return Array.from(
      new Set([
        '--stroke',
        '--fg-tertiary',
        '--font-mono',
        ...dynamicVars,
      ])
    )
  }, [series])

  const cssVars = useCssVars(cssVarNames)

  const stroke = cssVars['--stroke'] || '#000'
  const fgTertiary = cssVars['--fg-tertiary'] || '#666'
  const fontMono = cssVars['--font-mono'] || 'monospace'

  const handleAxisPointer = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (params: any) => {
      if (!onHoverRef.current) {
        return ''
      }

      const dataIndex = params?.seriesData?.[0]?.dataIndex
      if (typeof dataIndex === 'number') {
        onHoverRef.current(dataIndex)
        return ''
      }

      const pointerValue = params?.value ?? params?.axisValue
      const normalizedValue =
        typeof pointerValue === 'number'
          ? pointerValue
          : typeof pointerValue === 'string'
            ? Number(pointerValue)
            : NaN

      if (Number.isNaN(normalizedValue)) {
        return ''
      }

      const matchedIndex = categories.findIndex((value) => value === normalizedValue)
      if (matchedIndex >= 0) {
        onHoverRef.current(matchedIndex)
      }

      return ''
    },
    [categories]
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
          const resolveStartIndex = (value: unknown) => {
            if (categories.length === 0) return 0

            const numericValue =
              typeof value === 'number'
                ? value
                : typeof value === 'string'
                  ? Number(value)
                  : NaN

            if (Number.isNaN(numericValue)) {
              return 0
            }

            if (numericValue >= 0 && numericValue <= categories.length - 1) {
              return Math.max(
                0,
                Math.min(categories.length - 1, Math.floor(numericValue))
              )
            }

            const foundIndex = categories.findIndex((ts) => ts >= numericValue)
            return foundIndex === -1 ? categories.length - 1 : foundIndex
          }

          const resolveEndIndex = (value: unknown) => {
            if (categories.length === 0) return 0

            const numericValue =
              typeof value === 'number'
                ? value
                : typeof value === 'string'
                  ? Number(value)
                  : NaN

            if (Number.isNaN(numericValue)) {
              return categories.length - 1
            }

            if (numericValue >= 0 && numericValue <= categories.length - 1) {
              return Math.max(
                0,
                Math.min(categories.length - 1, Math.ceil(numericValue))
              )
            }

            for (let index = categories.length - 1; index >= 0; index -= 1) {
              const ts = categories[index]
              if (ts !== undefined && ts <= numericValue) {
                return index
              }
            }

            return 0
          }

          const rawStartIndex = resolveStartIndex(coordRange[0])
          const rawEndIndex = resolveEndIndex(coordRange[1])
          const startIndex = Math.min(rawStartIndex, rawEndIndex)
          const endIndex = Math.max(rawStartIndex, rawEndIndex)
          const startTimestamp = categories[startIndex]
          const endTimestamp = categories[endIndex]

          if (startTimestamp !== undefined && endTimestamp !== undefined) {
            onBrushEndRef.current(startTimestamp, endTimestamp)
          }

          chartInstanceRef.current?.dispatchAction({
            type: 'brush',
            command: 'clear',
            areas: [],
          })
        }
      }
    },
    [categories]
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

    chart.group = 'sandbox-monitoring'
    echarts.connect('sandbox-monitoring')
  }, [])

  const option = useMemo<EChartsOption>(() => {
    const values = series.flatMap((line) =>
      line.data
        .map((point) => point.y)
        .filter((value): value is number => value !== null)
    )
    const computedYAxisMax =
      yAxisMax ?? calculateAxisMax(values.length > 0 ? values : [0], 1.5)

    const findMaxCategoryIndex = () => {
      if (xAxisMax === undefined) {
        return Math.max(0, categories.length - 1)
      }

      for (let index = categories.length - 1; index >= 0; index -= 1) {
        const value = categories[index]
        if (value !== undefined && value <= xAxisMax) {
          return Math.max(minCategoryIndex, index)
        }
      }

      return minCategoryIndex
    }

    const minCategoryIndex =
      xAxisMin !== undefined
        ? Math.max(
            0,
            categories.findIndex((value) => value >= xAxisMin)
          )
        : 0
    const maxCategoryIndex = findMaxCategoryIndex()

    const seriesItems: SeriesOption[] = series.map((line) => {
      const lineColor = line.lineColorVar
        ? cssVars[line.lineColorVar]
        : undefined
      const areaColor = line.areaColorVar
        ? cssVars[line.areaColorVar]
        : undefined

      return {
        id: line.id,
        name: line.name,
        type: 'line',
        symbol: 'none',
        showSymbol: false,
        smooth: false,
        emphasis: {
          disabled: true,
        },
        stack: stacked ? 'sandbox-resource' : undefined,
        areaStyle: stacked
          ? {
              opacity: 0.18,
              color: areaColor || lineColor,
            }
          : undefined,
        lineStyle: {
          width: 1,
          color: lineColor,
        },
        data: line.data.map((point) => point.y ?? '-'),
      }
    })

    return {
      backgroundColor: 'transparent',
      animation: false,
      brush: {
        brushType: 'lineX',
        brushMode: 'single',
        xAxisIndex: 0,
        brushLink: 'all',
        brushStyle: { borderWidth: 1 },
        outOfBrush: { colorAlpha: 0.25 },
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
        min: minCategoryIndex,
        max: maxCategoryIndex,
        boundaryGap: false,
        axisLine: { show: true, lineStyle: { color: stroke } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          show: showXAxisLabels,
          color: fgTertiary,
          fontFamily: fontMono,
          fontSize: 12,
          hideOverlap: true,
          formatter: (value: number | string) => {
            const timestamp = Number(value)
            if (Number.isNaN(timestamp)) {
              return ''
            }

            const date = new Date(timestamp)
            const hours = date.getHours().toString().padStart(2, '0')
            const minutes = date.getMinutes().toString().padStart(2, '0')

            return `${hours}:${minutes}`
          },
        },
        axisPointer: {
          show: true,
          type: 'line',
          lineStyle: { color: stroke, type: 'solid', width: 1 },
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
          fontSize: 12,
          interval: 0,
          formatter: yAxisFormatter,
        },
        axisPointer: { show: false },
      },
      series: seriesItems,
    }
  }, [
    fontMono,
    fgTertiary,
    categories,
    series,
    cssVars,
    showXAxisLabels,
    stacked,
    stroke,
    handleAxisPointer,
    xAxisMax,
    xAxisMin,
    yAxisFormatter,
    yAxisMax,
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

const MemoizedSandboxMetricsChart = memo(
  SandboxMetricsChart,
  (prevProps, nextProps) => {
    return (
      prevProps.categories === nextProps.categories &&
      prevProps.series === nextProps.series &&
      prevProps.className === nextProps.className &&
      prevProps.stacked === nextProps.stacked &&
      prevProps.showXAxisLabels === nextProps.showXAxisLabels &&
      prevProps.xAxisMin === nextProps.xAxisMin &&
      prevProps.xAxisMax === nextProps.xAxisMax &&
      prevProps.yAxisMax === nextProps.yAxisMax &&
      prevProps.yAxisFormatter === nextProps.yAxisFormatter
      // callbacks are handled via refs
    )
  }
)

MemoizedSandboxMetricsChart.displayName = 'SandboxMetricsChart'

export default MemoizedSandboxMetricsChart
