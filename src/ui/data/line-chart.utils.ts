import deepmerge from 'deepmerge'
import { EChartsOption } from 'echarts'
import { defaultLineChartOption } from './line-chart.defaults'

export const mergeReplaceArrays = <T>(target: T, ...sources: Partial<T>[]): T =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deepmerge.all([target as any, ...sources] as any, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    arrayMerge: (_destinationArray: any[], sourceArray: any[]) => sourceArray,
  }) as T

/* -------------------------------------------------------------------------- */
// Data helpers
/* -------------------------------------------------------------------------- */

export type XYValue = string | number | Date

export interface LinePoint {
  x: XYValue
  y: number
}

export interface LineSeries {
  id: string
  name?: string
  data: LinePoint[]
  type?: 'line'
  coordinateSystem?: 'cartesian2d' | 'polar'
  clip?: boolean
  // styling overrides
  // @ts-expect-error - this is a workaround to allow for type safety
  lineStyle?: EChartsOption['series'][number]['lineStyle']
  // @ts-expect-error - this is a workaround to allow for type safety
  areaStyle?: EChartsOption['series'][number]['areaStyle']
  step?: false | 'start' | 'end' | 'middle'
  smooth?: boolean | number
  smoothMonotone?: 'x' | 'y' | 'none'
  connectNulls?: boolean
  showSymbol?: boolean
  showAllSymbol?: 'auto' | boolean
  triggerLineEvent?: boolean
}

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
      opacity: 0.08,
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

/* -------------------------------------------------------------------------- */
// Convenience preset to create final option
/* -------------------------------------------------------------------------- */
export const buildLineChartOption = (
  userOption: EChartsOption
): EChartsOption => mergeReplaceArrays(defaultLineChartOption, userOption)
