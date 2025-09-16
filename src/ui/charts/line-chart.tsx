'use client'

import type { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'
import { useTheme } from 'next-themes'
import { useMemo, useRef } from 'react'

import 'echarts/lib/chart/line'
import 'echarts/lib/component/brush'
import 'echarts/lib/component/dataZoom'
import 'echarts/lib/component/dataZoomInside'
import 'echarts/lib/component/title'

import { useBreakpoint } from '@/lib/hooks/use-breakpoint'
import { useCssVars } from '@/lib/hooks/use-css-vars'
import { TOOLTIP_TRANSITION_DURATION } from './constants'
import {
  createAxisPointerFormatter,
  createDefaultTooltipFormatter,
  createSplitLineInterval,
  createXAxisFormatter,
  createYAxisFormatter,
} from './formatters'
import {
  useAxisPointerSync,
  useChartInstance,
  useChartZoom,
  useResponsiveChartConfig,
  useYValueFinder,
} from './hooks'
import { defaultLineChartOption } from './options'
import { buildSeriesWithEnhancements } from './series'
import type { LineChartProps } from './types'
import { calculateYAxisMax, mergeReplaceArrays } from './utils'

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

  // get responsive configuration
  const responsiveConfig = useResponsiveChartConfig(duration)

  // chart instance management
  const { chartInstanceRef, handleChartReady } = useChartInstance(
    onChartReady,
    group
  )

  // y-value finder for axis pointer syncing
  const findYValueAtX = useYValueFinder(data)

  // axis pointer syncing
  useAxisPointerSync(chartInstanceRef.current, findYValueAtX, syncAxisPointers)

  // zoom event handler
  const handleZoom = useChartZoom(onZoomEnd)

  // build chart options
  const option = useMemo<EChartsOption>(() => {
    // build series with all enhancements
    const series = buildSeriesWithEnhancements(
      data,
      cssVars,
      showTooltip,
      yAxisLimit
    )

    // determine x-axis type from user options
    const xAxisType = userOption?.xAxis
      ? (userOption.xAxis as { type?: string }).type
      : 'category'

    // build tooltip configuration
    const tooltipConfig: EChartsOption['tooltip'] = showTooltip
      ? {
          show: true,
          trigger: 'axis' as const,
          triggerOn: 'mousemove|click' as const,
          confine: true,
          transitionDuration: TOOLTIP_TRANSITION_DURATION,
          enterable: false,
          hideDelay: 0,
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
            tooltipFormatter || createDefaultTooltipFormatter(responsiveConfig),
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

    // build themed defaults
    const themedDefaults = mergeReplaceArrays(defaultLineChartOption, {
      tooltip: tooltipConfig,
      xAxis: {
        axisLine: { lineStyle: { color: cssVars['--stroke'] } },
        axisLabel: {
          show: responsiveConfig.showAxisLabels,
          color: cssVars['--fg-tertiary'],
          fontFamily: cssVars['--font-mono'],
          fontSize: responsiveConfig.fontSize,
          rotate: responsiveConfig.xAxisRotate,
          interval: responsiveConfig.xAxisInterval,
          formatter: createXAxisFormatter(xAxisType, responsiveConfig),
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter: createAxisPointerFormatter(xAxisType) as any,
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
          formatter: createYAxisFormatter(yAxisLimit),
          overflow: 'truncate' as const,
          ellipsis: '…',
          width: breakpoint.isSmDown ? 30 : 40,
        },
        axisPointer: {
          show: false,
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
          interval: createSplitLineInterval(yAxisLimit),
        },
        splitNumber: responsiveConfig.yAxisSplitNumber,
        max: function (value: { max: number }) {
          return calculateYAxisMax(data, yAxisLimit)
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
      series,
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
    responsiveConfig,
    breakpoint.isSmDown,
    syncAxisPointers,
    showTooltip,
    tooltipFormatter,
  ])

  return (
    <ReactECharts
      ref={ref}
      key={resolvedTheme}
      option={option}
      notMerge={true}
      style={{ width: '100%', height: '100%' }}
      lazyUpdate={true}
      onChartReady={handleChartReady}
      className={className}
      onEvents={{
        datazoom: handleZoom,
      }}
    />
  )
}
