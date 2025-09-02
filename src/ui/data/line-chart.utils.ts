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
  // styling overrides
  // @ts-expect-error - this is a workaround to allow for type safety
  lineStyle?: EChartsOption['series'][number]['lineStyle']
  // @ts-expect-error - this is a workaround to allow for type safety
  areaStyle?: EChartsOption['series'][number]['areaStyle']
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
  }
): EChartsOption['series'] => {
  return series.map((s) => ({
    id: s.id,
    name: s.name ?? s.id,
    type: 'line',
    symbol: 'none',
    lineStyle: {
      width: 1.5,
      color: s.lineStyle?.color ?? colors['--fg'],
      ...(s.lineStyle ?? {}),
    },
    areaStyle: s.areaStyle ?? {
      color: colors['--fg'],
      opacity: 0.08,
    },
    data: s.data.map((p) => [p.x instanceof Date ? p.x.getTime() : p.x, p.y]),
  }))
}

/* -------------------------------------------------------------------------- */
// Convenience preset to create final option
/* -------------------------------------------------------------------------- */
export const buildLineChartOption = (
  userOption: EChartsOption
): EChartsOption => mergeReplaceArrays(defaultLineChartOption, userOption)
