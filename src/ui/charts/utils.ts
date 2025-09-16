/**
 * Utility functions for line chart
 */

import deepmerge from 'deepmerge'
import { EChartsOption } from 'echarts'
import { AREA_STYLE_OPACITY, Y_AXIS_MAX_MULTIPLIER } from './constants'
import { defaultLineChartOption } from './options'
import { type LineSeries } from './types'

/* -------------------------------------------------------------------------- */
// Data types
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
// Chart option helpers
/* -------------------------------------------------------------------------- */

export const mergeReplaceArrays = <T>(target: T, ...sources: Partial<T>[]): T =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deepmerge.all([target as any, ...sources] as any, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    arrayMerge: (_destinationArray: any[], sourceArray: any[]) => sourceArray,
  }) as T

/**
 * Turns a list of series definitions into ECharts series option ready to merge
 * with defaultLineChartOption.
 */
export const makeSeriesFromData = (
  series: LineSeries[],
  // colour palette / css vars injected by caller
  colors: {
    '--fg': string
    '--stroke': string
    [key: string]: string
  },
  showTooltip = false
): EChartsOption['series'] => {
  return series.map((s) => ({
    id: s.id,
    name: s.name ?? s.id,
    type: 'line',
    symbol: showTooltip ? 'circle' : 'none',
    symbolSize: 0, // don't show symbols by default
    lineStyle: {
      width: 1,
      color: s.lineStyle?.color ?? colors['--fg'],
      ...(s.lineStyle ?? {}),
    },
    areaStyle: s.areaStyle ?? {
      color: colors['--fg'],
      opacity: AREA_STYLE_OPACITY,
    },
    step: s.step,
    smooth: s.smooth,
    smoothMonotone: s.smoothMonotone,
    connectNulls: s.connectNulls,
    showSymbol: s.showSymbol ?? false,
    showAllSymbol: s.showAllSymbol,
    triggerLineEvent: s.triggerLineEvent,
    // show symbols on hover when tooltip is enabled
    emphasis: showTooltip
      ? {
          scale: 1.5,
          symbolSize: 6,
          itemStyle: {
            borderWidth: 2,
            borderColor: s.lineStyle?.color ?? colors['--fg'],
          },
        }
      : undefined,
    data: s.data.map((p) => [p.x instanceof Date ? p.x.getTime() : p.x, p.y]),
  }))
}

/**
 * Convenience preset to create final option
 */
export const buildLineChartOption = (
  userOption: EChartsOption
): EChartsOption => mergeReplaceArrays(defaultLineChartOption, userOption)

/* -------------------------------------------------------------------------- */
// Calculation utilities
/* -------------------------------------------------------------------------- */

/**
 * Calculate the maximum Y value across all series
 */
export function calculateMaxYValue(data: LineSeries[]): number {
  let maxValue = 0
  data.forEach((seriesData) => {
    seriesData.data.forEach((point) => {
      if (point.y > maxValue) {
        maxValue = point.y
      }
    })
  })
  return maxValue
}

/**
 * Calculate the Y-axis maximum value with appropriate padding
 */
export function calculateYAxisMax(
  data: LineSeries[],
  yAxisLimit?: number
): number {
  const dataMax = calculateMaxYValue(data)
  return Math.ceil(yAxisLimit ? yAxisLimit : dataMax * Y_AXIS_MAX_MULTIPLIER)
}

/**
 * Determine if seconds should be hidden based on duration
 */
export function shouldHideSecondsForDuration(duration?: number): boolean {
  if (!duration) return false
  const thirtyMinutesMs = 30 * 60 * 1000
  return duration >= thirtyMinutesMs
}

/**
 * Extract timestamp from a data point
 */
export function getPointTimestamp(point: { x: unknown }): number | null {
  const x = point.x
  if (x instanceof Date) {
    return x.getTime()
  } else if (typeof x === 'number') {
    return x
  } else if (typeof x === 'string') {
    const parsed = new Date(x).getTime()
    return isNaN(parsed) ? null : parsed
  }
  return null
}
