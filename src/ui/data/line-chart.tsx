'use client'

import { useBreakpoint } from '@/lib/hooks/use-breakpoint'
import { useCssVars } from '@/lib/hooks/use-css-vars'
import {
  formatChartTimestampLocal,
  formatNumber,
  formatTimeAxisLabel,
} from '@/lib/utils/formatting'
import { format } from 'date-fns'
import * as echarts from 'echarts'
import { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'

import 'echarts/lib/chart/line'
import 'echarts/lib/component/brush'
import 'echarts/lib/component/dataZoom'
import 'echarts/lib/component/dataZoomInside'
import 'echarts/lib/component/title'

import { createSingleValueTooltipFormatter } from '@/features/dashboard/sandboxes/monitoring/chart-utils'
import { useTheme } from 'next-themes'
import { useCallback, useMemo, useRef } from 'react'
import { renderToString } from 'react-dom/server'
import { defaultLineChartOption } from './line-chart.defaults'
import {
  LineSeries,
  makeSeriesFromData,
  mergeReplaceArrays,
} from './line-chart.utils'
import DefaultTooltip, { LimitLineTooltip } from './tooltips'

type TooltipFormatterParams = echarts.TooltipComponentFormatterCallbackParams
type TooltipFormatterParamsArray =
  | TooltipFormatterParams
  | TooltipFormatterParams[]

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

  /** Timeframe duration in milliseconds (for smart time formatting) */
  duration?: number

  /** Synchronize y-axis pointer to x-axis pointer position */
  syncAxisPointers?: boolean

  /** Show tooltip at data points instead of cursor position */
  showTooltip?: boolean

  /** Custom tooltip formatter function */
  tooltipFormatter?: ReturnType<typeof createSingleValueTooltipFormatter>
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
  duration,
  syncAxisPointers = false,
  showTooltip = false,
  tooltipFormatter,
}: LineChartProps) {
  const ref = useRef<ReactECharts | null>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const { resolvedTheme } = useTheme()
  const breakpoint = useBreakpoint()

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
    // hide seconds when timespan is 30 minutes or more
    const thirtyMinutesMs = 30 * 60 * 1000 // 30 minutes in milliseconds
    const shouldHideSeconds = duration ? duration >= thirtyMinutesMs : false

    return {
      // reduce tick density on smaller viewports
      xAxisSplitNumber: breakpoint.isXs
        ? 3
        : breakpoint.isSm
          ? 4
          : breakpoint.isMd
            ? 5
            : 8,
      yAxisSplitNumber: breakpoint.isXs ? 3 : breakpoint.isSmDown ? 5 : 6,
      // always show labels - fixes safari issue
      showAxisLabels: true,
      // smaller fonts on small viewports
      fontSize: breakpoint.isSmDown ? 10 : 12,
      // no rotation - removed as requested
      xAxisRotate: 0,
      // skip labels on viewports under lg (1024px) to prevent overlap
      xAxisInterval: breakpoint.isXs
        ? 2
        : breakpoint.isSm
          ? 1
          : !breakpoint.isLgUp
            ? 'auto'
            : 0,
      // compact time format for small viewports
      isCompactTimeFormat: breakpoint.isSmDown,
      isVeryCompactTimeFormat: breakpoint.isXs,
      // smart seconds display based on timeframe duration
      shouldHideSeconds,
    }
  }, [breakpoint, duration])

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
    const series = makeSeriesFromData(data, cssVars, showTooltip)
    const responsiveConfig = getResponsiveAxisConfig()

    const calculateMaxYValue = () => {
      let maxValue = 0
      data.forEach((seriesData) => {
        seriesData.data.forEach((point) => {
          if (point.y > maxValue) {
            maxValue = point.y
          }
        })
      })
      return Math.ceil(yAxisLimit ? yAxisLimit : maxValue * 1.3)
    }

    const calculateGridLeft = () => {
      const maxY = calculateMaxYValue()
      const formattedMaxY = formatNumber(maxY)
      const charLength = formattedMaxY.length

      const basePadding = 20
      const charWidth = responsiveConfig.fontSize * 0.65
      const padding = basePadding + charLength * charWidth

      return Math.max(35, Math.min(padding, 120))
    }

    // Check if data is "live" (last point less than 2 min old)
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

      // 2 minutes in milliseconds
      const twoMinutesMs = 2 * 60 * 1000

      return lastTimestamp > now - twoMinutesMs && lastTimestamp <= now
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
                  console.log('params', params)
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
                    opacity: 0.8,
                    type: 'dashed' as const,
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
            // show symbol on hover when tooltip is enabled
            emphasis: showTooltip
              ? {
                  focus: 'series',
                  itemStyle: {
                    borderWidth: 2,
                    borderColor: lineColor,
                  },
                  scale: true,
                  symbolSize: 8,
                }
              : undefined,
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

    // Build the tooltip configuration
    const tooltipConfig: EChartsOption['tooltip'] = showTooltip
      ? {
          show: true,
          trigger: 'axis' as const,
          triggerOn: 'mousemove|click' as const,
          confine: true,
          transitionDuration: 0.2,
          enterable: false,
          hideDelay: 0,
          axisPointer: {
            type: 'cross' as const,
            snap: true,
            animation: false,
          },
          backgroundColor: 'transparent',
          padding: 0,
          borderWidth: 0,
          shadowBlur: 0,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          shadowColor: 'transparent',
          textStyle: {
            color: cssVars['--fg'],
            fontSize: responsiveConfig.fontSize,
          },
          formatter:
            tooltipFormatter ||
            ((params: TooltipFormatterParamsArray) => {
              const paramArray = Array.isArray(params) ? params : [params]
              const validParams = paramArray.filter(
                (p) => typeof p !== 'string' && p !== null
              )

              if (validParams.length === 0) return ''

              const firstParam = validParams[0]
              if (!firstParam) return ''

              const timestamp =
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (firstParam as any).axisValueLabel ||
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (firstParam as any).name ||
                ''

              const items = validParams
                .filter((param) => {
                  // Handle both array values (line/scatter) and single values (bar/pie)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const paramValue = (param as any).value
                  if (Array.isArray(paramValue)) {
                    return paramValue[1] !== null && paramValue[1] !== undefined
                  }
                  return paramValue !== null && paramValue !== undefined
                })
                .map((param) => {
                  // Extract the actual value from various data formats
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const paramValue = (param as any).value
                  let actualValue: unknown
                  if (Array.isArray(paramValue)) {
                    actualValue = paramValue[1] // [x, y] format
                  } else {
                    actualValue = paramValue // single value format
                  }

                  // Format the value based on its type
                  let formattedValue: string
                  if (typeof actualValue === 'number') {
                    formattedValue = formatNumber(actualValue)
                  } else {
                    formattedValue = String(actualValue)
                  }

                  return {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label: (param as any).seriesName || 'Value',
                    value: formattedValue,
                  }
                })

              return renderToString(
                <DefaultTooltip label={timestamp} items={items} />
              )
            }),
        }
      : {
          backgroundColor: 'transparent',
          padding: 0,
          borderWidth: 0,
          shadowBlur: 0,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          shadowColor: 'transparent',
          trigger: 'axis' as const,
          showDelay: 0,
        }

    const themedDefaults = mergeReplaceArrays(defaultLineChartOption, {
      tooltip: tooltipConfig,
      grid: {
        left: calculateGridLeft(),
      },
      xAxis: {
        axisLine: { lineStyle: { color: cssVars['--stroke'] } },
        axisLabel: {
          show: responsiveConfig.showAxisLabels,
          color: cssVars['--fg-tertiary'],
          fontFamily: cssVars['--font-mono'],
          fontSize: responsiveConfig.fontSize,
          rotate: responsiveConfig.xAxisRotate,
          interval: responsiveConfig.xAxisInterval,
          formatter: (value: string | number): string => {
            // If this is a time axis, format using our utility
            if (
              userOption?.xAxis &&
              (userOption.xAxis as { type?: string }).type === 'time'
            ) {
              const date = new Date(value)
              const isNewDay = date.getHours() === 0 && date.getMinutes() === 0

              // use compact formats for small viewports
              if (responsiveConfig.isVeryCompactTimeFormat) {
                // very compact: just time without seconds or period (e.g., "12:45")
                if (isNewDay) {
                  return format(date, 'MMM d')
                }
                return format(date, 'HH:mm')
              } else if (responsiveConfig.isCompactTimeFormat) {
                // compact: time with period but no seconds (e.g., "12:45 PM")
                if (isNewDay) {
                  return format(date, 'MMM d')
                }
                return format(date, 'h:mm a')
              } else if (responsiveConfig.shouldHideSeconds) {
                // hide seconds for long timespans (30 minutes or more)
                if (isNewDay) {
                  return format(date, 'MMM d')
                }
                return format(date, 'h:mm a')
              }

              // default format with seconds
              return formatTimeAxisLabel(value, isNewDay)
            }
            return String(value)
          },
        },
        axisPointer: {
          lineStyle: {
            color: cssVars['--bg-inverted'],
            type: 'dashed',
          },
          label: {
            backgroundColor: cssVars['--bg-highlight'],
            color: cssVars['--fg'],
            fontFamily: cssVars['--font-mono'],
            borderRadius: 0,
            fontSize: responsiveConfig.fontSize,
            formatter: ((params: { value: unknown }): string => {
              // If this is a time axis, format using our utility
              if (
                userOption?.xAxis &&
                (userOption.xAxis as { type?: string }).type === 'time'
              ) {
                return formatChartTimestampLocal(
                  params.value as string | number
                )
              }
              return String(params.value)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }) as any,
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
          lineStyle: {
            color: cssVars['--bg-inverted'],
            type: 'dashed',
          },
          label: {
            backgroundColor: cssVars['--bg-highlight'],
            color: cssVars['--fg'],
            fontFamily: cssVars['--font-mono'],
            position: 'top',
            borderRadius: 0,
            fontSize: responsiveConfig.fontSize,
          },
          snap: !syncAxisPointers, // disable snap when syncing
        },
        splitLine: {
          lineStyle: { color: cssVars['--stroke'], type: 'dashed' },
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
    syncAxisPointers,
    showTooltip,
    tooltipFormatter,
  ])

  // helper to find y-value for given x-value
  const findYValueAtX = useCallback(
    (xValue: number) => {
      if (!data || data.length === 0) return null

      // search in first data series
      const series = data[0]
      if (!series?.data) return null

      // binary search for efficiency (assuming sorted data)
      let left = 0
      let right = series.data.length - 1
      let closestIdx = 0
      let minDiff = Infinity

      while (left <= right) {
        const mid = Math.floor((left + right) / 2)
        const point = series.data[mid]
        if (!point) continue

        const pointX =
          point.x instanceof Date
            ? point.x.getTime()
            : typeof point.x === 'number'
              ? point.x
              : parseFloat(String(point.x))

        if (isNaN(pointX)) continue

        const diff = Math.abs(pointX - xValue)

        if (diff < minDiff) {
          minDiff = diff
          closestIdx = mid
        }

        if (pointX < xValue) {
          left = mid + 1
        } else if (pointX > xValue) {
          right = mid - 1
        } else {
          // exact match
          return point.y
        }
      }

      return series.data[closestIdx]?.y ?? null
    },
    [data]
  )
  const onChartReadyCallback = useCallback(
    (chart: echarts.ECharts) => {
      chartInstanceRef.current = chart

      // sync y-axis pointer when x-axis pointer moves
      if (syncAxisPointers) {
        chart.on('updateAxisPointer', (event: unknown) => {
          const axisEvent = event as {
            axesInfo?: Array<{
              axisDim?: string
              value?: number
            }>
          }

          // Look for x-axis info
          if (axisEvent.axesInfo && axisEvent.axesInfo.length > 0) {
            const xAxisInfo = axisEvent.axesInfo.find(
              (info) => info.axisDim === 'x'
            )

            if (xAxisInfo && typeof xAxisInfo.value !== 'undefined') {
              // find the corresponding y-value at this x position
              const yValue = findYValueAtX(xAxisInfo.value)

              if (yValue !== null) {
                // update y-axis pointer to match x-axis data point
                chart.setOption(
                  {
                    yAxis: {
                      axisPointer: {
                        value: yValue,
                        label: {
                          formatter: formatNumber(yValue).toString(),
                        },
                      },
                    },
                  },
                  {
                    lazyUpdate: true,
                    silent: true,
                  }
                )
              }
            }
          }
        })
      }

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
    },
    [findYValueAtX, group, onChartReady, syncAxisPointers]
  )

  return (
    <ReactECharts
      ref={ref}
      echarts={echarts}
      key={resolvedTheme}
      option={option}
      notMerge={true}
      style={{ width: '100%', height: '100%' }}
      lazyUpdate={true}
      onChartReady={onChartReadyCallback}
      className={className}
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
  )
}
