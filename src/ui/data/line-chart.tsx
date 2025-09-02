'use client'

import { ENABLE_CONCURRENT_CHART_WARNING_LINE } from '@/configs/flags'
import { useCssVars } from '@/lib/hooks/use-css-vars'
import {
  formatChartTimestamp,
  formatNumber,
  formatTimeAxisLabel,
} from '@/lib/utils/formatting'
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
import { renderToString } from 'react-dom/server'
import { defaultLineChartOption } from './line-chart.defaults'
import {
  LineSeries,
  makeSeriesFromData,
  mergeReplaceArrays,
} from './line-chart.utils'
import { LimitLineTooltip } from './tooltips'

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
    '--fg-secondary',
    '--fg-tertiary',
    '--bg-1',
    '--bg-hover',
    '--bg-highlight',
    '--bg-inverted',
    '--font-mono',
    '--accent-error-highlight',
    '--accent-error-bg',
    '--accent-warning-highlight',
    '--accent-warning-bg',
    '--accent-positive-highlight',
  ] as const)

  // responsive axis config based on viewport size
  const getResponsiveAxisConfig = useCallback(() => {
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

      return value === limit || value === limit * 0.8
        ? ''
        : formatNumber(value).toString()
    }
  }, [])

  const option = useMemo<EChartsOption>(() => {
    const series = makeSeriesFromData(data, cssVars)
    const responsiveConfig = getResponsiveAxisConfig()

    // Check if data is "live" (last point less than 1 minute old)
    const isLiveData = (seriesData: LineSeries) => {
      if (!seriesData.data.length) return false
      const lastPoint = seriesData.data[seriesData.data.length - 1]
      if (!lastPoint) return false

      const lastTimestamp =
        lastPoint.x instanceof Date
          ? lastPoint.x.getTime()
          : typeof lastPoint.x === 'number'
            ? lastPoint.x
            : new Date(lastPoint.x).getTime()

      const now = Date.now()
      const oneMinuteAgo = now - 60 * 1000

      return lastTimestamp > oneMinuteAgo && lastTimestamp <= now
    }

    const limitLineConfig =
      yAxisLimit !== undefined
        ? {
            markLine: {
              symbol: 'none',
              label: {
                show: true,
                fontFamily: cssVars['--font-mono'],
              },
              lineStyle: {
                type: 'solid' as const,
                width: 1,
              },
              z: 10,
              tooltip: {
                trigger: 'item' as const,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter: (params: any) => {
                  const value = params.data?.yAxis
                  if (value === undefined) return ''
                  return renderToString(
                    <LimitLineTooltip value={value} limit={yAxisLimit} />
                  )
                },
                backgroundColor: 'transparent',
                borderWidth: 0,
                padding: 0,
              },
              emphasis: {
                disabled: true,
                tooltip: {
                  show: false,
                },
              },
              data: [
                ...(ENABLE_CONCURRENT_CHART_WARNING_LINE
                  ? [
                      {
                        yAxis: yAxisLimit * 0.8,
                        name: '80% Warning',
                        label: {
                          formatter: `${formatNumber(Math.round(yAxisLimit * 0.8))}`,
                          position: 'start' as const,
                          backgroundColor: cssVars['--accent-warning-bg'],
                          color: cssVars['--accent-warning-highlight'],
                          fontFamily: cssVars['--font-mono'],
                          borderRadius: 0,
                          padding: [4, 8],
                        },
                        lineStyle: {
                          color: cssVars['--accent-warning-highlight'],
                          opacity: 0.8,
                          type: 'dashed' as const,
                          width: 1,
                        },
                      },
                    ]
                  : []),
                {
                  yAxis: yAxisLimit,
                  name: 'Limit',
                  label: {
                    formatter: `${formatNumber(yAxisLimit)}`,
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
                    opacity: 1,
                    type: 'solid' as const,
                    width: 2,
                  },
                },
              ],
            },
          }
        : {}

    const seriesWithLiveIndicator = Array.isArray(series)
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        series.map((s: any, idx: number) => {
          const originalData = data[idx]
          if (!originalData || !isLiveData(originalData)) return s

          const lastPoint = originalData.data[originalData.data.length - 1]
          if (!lastPoint) return s

          // Add markPoint for live indicator
          const lineColor =
            s.lineStyle?.color || cssVars['--accent-positive-highlight']

          return {
            ...s,
            markPoint: {
              silent: true,
              animation: false,
              data: [
                // Outer pulsing ring
                {
                  coord: [
                    lastPoint.x instanceof Date
                      ? lastPoint.x.getTime()
                      : lastPoint.x,
                    lastPoint.y,
                  ],
                  symbol: 'circle',
                  symbolSize: 16,
                  itemStyle: {
                    color: 'transparent',
                    borderColor: lineColor,
                    borderWidth: 1,
                    shadowBlur: 8,
                    shadowColor: lineColor,
                    opacity: 0.4,
                  },
                  emphasis: {
                    disabled: true,
                  },
                  label: {
                    show: false,
                  },
                },
                // Middle ring
                {
                  coord: [
                    lastPoint.x instanceof Date
                      ? lastPoint.x.getTime()
                      : lastPoint.x,
                    lastPoint.y,
                  ],
                  symbol: 'circle',
                  symbolSize: 10,
                  itemStyle: {
                    color: lineColor,
                    opacity: 0.3,
                    borderWidth: 0,
                  },
                  emphasis: {
                    disabled: true,
                  },
                  label: {
                    show: false,
                  },
                },
                // Inner solid dot
                {
                  coord: [
                    lastPoint.x instanceof Date
                      ? lastPoint.x.getTime()
                      : lastPoint.x,
                    lastPoint.y,
                  ],
                  symbol: 'circle',
                  symbolSize: 6,
                  itemStyle: {
                    color: lineColor,
                    borderWidth: 0,
                    shadowBlur: 4,
                    shadowColor: lineColor,
                  },
                  emphasis: {
                    disabled: true,
                  },
                  label: {
                    show: false,
                  },
                },
              ],
            },
            showSymbol: false,
            symbol: 'none',
          }
        })
      : series

    const seriesWithLimit = Array.isArray(seriesWithLiveIndicator)
      ? seriesWithLiveIndicator.map((s, index) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          index === 0 ? ({ ...s, ...limitLineConfig } as any) : s
        )
      : seriesWithLiveIndicator
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ({ ...seriesWithLiveIndicator, ...limitLineConfig } as any)
        : seriesWithLiveIndicator

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
      grid: {
        left: '4%',
        right: 8,
      },
      xAxis: {
        axisLine: { lineStyle: { color: cssVars['--stroke'] } },
        axisLabel: {
          show: responsiveConfig.showAxisLabels,
          color: cssVars['--fg-tertiary'],
          fontFamily: cssVars['--font-mono'],
          fontSize: responsiveConfig.fontSize,
          formatter: (value: string | number): string => {
            // If this is a time axis, format using our utility
            if (
              userOption?.xAxis &&
              (userOption.xAxis as { type?: string }).type === 'time'
            ) {
              const date = new Date(value)
              const isNewDay = date.getHours() === 0 && date.getMinutes() === 0
              return formatTimeAxisLabel(value, isNewDay)
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
              // If this is a time axis, format using our utility
              if (
                userOption?.xAxis &&
                (userOption.xAxis as { type?: string }).type === 'time'
              ) {
                return formatChartTimestamp(params.value as string | number)
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
