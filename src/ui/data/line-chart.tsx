'use client'

import { useCssVars } from '@/lib/hooks/use-css-vars'
import { cn } from '@/lib/utils/ui'
import * as echarts from 'echarts'
import { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'

import 'echarts/lib/chart/line'
import 'echarts/lib/component/brush'
import 'echarts/lib/component/dataZoom'
import 'echarts/lib/component/dataZoomInside'
import 'echarts/lib/component/title'

import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defaultLineChartOption } from './line-chart.defaults'
import {
  LineSeries,
  makeSeriesFromData,
  mergeReplaceArrays,
} from './line-chart.utils'

export interface LineChartProps {
  /** Chart data series */
  data: LineSeries[]

  /** Full ECharts option that will be merged with defaults */
  option?: EChartsOption

  /** Custom handler for zoom end – receives from/to timestamps */
  onZoomEnd?: (from: number, to: number) => void

  /** Y-axis limit value to highlight with error styling */
  yAxisLimit?: number

  /** CSS class name */
  className?: string

  /** Inline styles */
  style?: React.CSSProperties

  /** Callback to receive the chart instance for external control */
  onChartReady?: (chart: echarts.ECharts) => void

  /** Group name for connecting multiple charts */
  group?: string
}

export default function LineChart({
  data,
  option: userOption,
  onZoomEnd,
  yAxisLimit,
  className,
  style,
  onChartReady,
  group,
}: LineChartProps) {
  const ref = useRef<ReactECharts | null>(null)
  const { resolvedTheme } = useTheme()

  // track window dimensions for responsive config
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  })

  // update on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const cssVars = useCssVars([
    '--stroke',
    '--stroke-active',
    '--fg',
    '--fg-tertiary',
    '--bg-1',
    '--bg-hover',
    '--bg-highlight',
    '--bg-inverted',
    '--font-mono',
    '--accent-error-highlight',
    '--accent-error-bg',
  ] as const)

  // responsive axis config based on viewport size
  const getResponsiveAxisConfig = useCallback(() => {
    // use window dimensions to avoid safari timing issues

    const isSmallViewport =
      windowDimensions.width < 600 || windowDimensions.height < 400
    const isMediumViewport =
      windowDimensions.width < 900 || windowDimensions.height < 600

    return {
      // reduce tick density on smaller viewports
      xAxisSplitNumber: isSmallViewport ? 3 : isMediumViewport ? 5 : 8,
      yAxisSplitNumber: isSmallViewport ? 3 : isMediumViewport ? 5 : 6,
      // always show labels - fixes safari issue
      showAxisLabels: true,
      // smaller fonts on small viewports
      fontSize: isSmallViewport ? 10 : 12,
    }
  }, [windowDimensions])

  const createSplitLineInterval = useCallback((limit: number) => {
    return (value: string | number) => {
      if (typeof value === 'string') {
        value = parseFloat(value)
      }

      return value === limit ? '' : value.toString()
    }
  }, [])

  const option = useMemo<EChartsOption>(() => {
    const series = makeSeriesFromData(data, cssVars)
    const responsiveConfig = getResponsiveAxisConfig()

    const limitLineConfig =
      yAxisLimit !== undefined
        ? {
            markLine: {
              silent: true,
              symbol: 'none',
              label: {
                show: true,
                fontFamily: cssVars['--font-mono'],
              },
              lineStyle: {
                type: 'solid' as const,
                width: 1,
              },
              z: 1000,
              data: [
                {
                  yAxis: yAxisLimit * 0.8,
                  label: {
                    formatter: `${Math.round(yAxisLimit * 0.8)}`,
                    position: 'start' as const,
                    backgroundColor: cssVars['--accent-error-bg'],
                    color: cssVars['--accent-error-highlight'],
                    fontFamily: cssVars['--font-mono'],
                    borderRadius: 0,
                    padding: [4, 8],
                  },
                  lineStyle: {
                    color: cssVars['--accent-error-highlight'],
                    opacity: 0.3,
                    type: 'dashed' as const,
                    width: 2,
                  },
                },
                {
                  yAxis: yAxisLimit,
                  label: {
                    formatter: `${yAxisLimit}`,
                    position: 'start' as const,
                    backgroundColor: cssVars['--bg-1'],
                    color: cssVars['--accent-error-highlight'],
                    fontFamily: cssVars['--font-mono'],
                    borderRadius: 0,
                    padding: [4, 8],
                    style: {
                      borderWidth: 0,
                      borderColor: cssVars['--accent-error-highlight'],
                      backgroundColor: cssVars['--accent-error-bg'],
                    },
                  },
                  lineStyle: {
                    color: cssVars['--accent-error-highlight'],
                    opacity: 0.6,
                    type: 'solid' as const,
                    width: 2,
                  },
                },
              ],
            },
          }
        : {}

    const seriesWithLimit = Array.isArray(series)
      ? series.map((s, index) =>
          index === 0 ? { ...s, ...limitLineConfig } : s
        )
      : series
        ? { ...series, ...limitLineConfig }
        : series

    const themedDefaults = mergeReplaceArrays(defaultLineChartOption, {
      tooltip: {
        backgroundColor: 'transparent',
        padding: 0,
        borderWidth: 0,
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: 'transparent',
      },
      xAxis: {
        axisLine: { lineStyle: { color: cssVars['--stroke'] } },
        axisLabel: {
          show: responsiveConfig.showAxisLabels,
          color: cssVars['--fg-tertiary'],
          fontFamily: cssVars['--font-mono'],
          fontSize: responsiveConfig.fontSize,
          formatter: (value: string | number): string => {
            // If this is a time axis, format using US locale
            if (
              userOption?.xAxis &&
              (userOption.xAxis as { type?: string }).type === 'time'
            ) {
              const date = new Date(value)
              const hour = date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })
              const day = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
              // Show date if it's the first label of a new day
              const isNewDay = date.getHours() === 0 && date.getMinutes() === 0
              return isNewDay ? day : hour
            }
            return String(value)
          },
        },
        axisPointer: {
          lineStyle: { color: cssVars['--stroke-active'] },
          label: {
            backgroundColor: cssVars['--bg-highlight'],
            color: cssVars['--fg'],
            fontFamily: cssVars['--font-mono'],
            position: 'top',
            borderRadius: 0,
            fontSize: responsiveConfig.fontSize,
            formatter: ((params: { value: unknown }): string => {
              // If this is a time axis, format using US locale
              if (
                userOption?.xAxis &&
                (userOption.xAxis as { type?: string }).type === 'time'
              ) {
                const date = new Date(params.value as string | number)
                return date.toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })
              }
              return String(params.value)
            }) as unknown as string | ((params: unknown) => string),
          },
          snap: true,
        },
        splitLine: {
          lineStyle: { color: cssVars['--stroke'] },
        },
        splitNumber: responsiveConfig.xAxisSplitNumber,
      },
      yAxis: {
        axisLine: { lineStyle: { color: cssVars['--stroke'] } },
        axisLabel: {
          show: responsiveConfig.showAxisLabels,
          color: cssVars['--fg-tertiary'],
          fontFamily: cssVars['--font-mono'],
          fontSize: responsiveConfig.fontSize,
          formatter: createSplitLineInterval(yAxisLimit ?? 0),
        },
        axisPointer: {
          lineStyle: { color: cssVars['--stroke-active'] },
          label: {
            backgroundColor: cssVars['--bg-highlight'],
            color: cssVars['--fg'],
            fontFamily: cssVars['--font-mono'],
            position: 'top',
            borderRadius: 0,
            fontSize: responsiveConfig.fontSize,
          },
          snap: true,
        },
        splitLine: {
          lineStyle: { color: cssVars['--stroke'] },
        },
        splitNumber: responsiveConfig.yAxisSplitNumber,
        max: function (value: { max: number }) {
          return Math.ceil(yAxisLimit ? yAxisLimit : value.max * 1.3)
        },
      },
      toolbox: {
        feature: {
          dataZoom: {
            brushStyle: {
              borderWidth: 1,
              color: resolvedTheme === 'dark' ? '#f2f2f244' : '#1f1f1f44',
              borderColor: cssVars['--bg-inverted'],
              opacity: 0.6,
            },
          },
        },
      },
      series: seriesWithLimit,
    })

    return userOption
      ? mergeReplaceArrays(themedDefaults, userOption)
      : themedDefaults
  }, [
    data,
    cssVars,
    userOption,
    yAxisLimit,
    resolvedTheme,
    getResponsiveAxisConfig,
    createSplitLineInterval,
  ])

  const onChartReadyCallback = (chart: echarts.ECharts) => {
    // activate datazoom
    chart.dispatchAction(
      {
        type: 'takeGlobalCursor',
        key: 'dataZoomSelect',
        dataZoomSelectActive: true,
      },
      {
        flush: true,
      }
    )

    // Set the group if provided for chart connection
    if (group) {
      chart.group = group
    }

    // Call the external callback if provided
    if (onChartReady) {
      onChartReady(chart)
    }
  }

  return (
    <div className={cn('w-full h-full', className)} style={style}>
      <ReactECharts
        ref={ref}
        echarts={echarts}
        key={resolvedTheme}
        option={option}
        notMerge={true}
        style={{ width: '100%', height: '100%' }}
        lazyUpdate={true}
        onChartReady={onChartReadyCallback}
        onEvents={{
          datazoom: (params: {
            batch?: Array<{
              startValue?: number
              endValue?: number
            }>
          }) => {
            if (onZoomEnd && params.batch && params.batch[0]) {
              const { startValue, endValue } = params.batch[0]

              if (startValue !== undefined && endValue !== undefined) {
                onZoomEnd(Math.round(startValue), Math.round(endValue))
              }
            }
          },
        }}
      />
    </div>
  )
}
