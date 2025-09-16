/**
 * Type definitions for line chart components
 */

import type {
  ECharts,
  EChartsOption,
  TooltipComponentFormatterCallbackParams,
} from 'echarts'

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
  onChartReady?: (chart: ECharts) => void

  /** Group name for connecting multiple charts */
  group?: string

  /** Timeframe duration in milliseconds (for smart time formatting) */
  duration?: number

  /** Synchronize y-axis pointer to x-axis pointer position */
  syncAxisPointers?: boolean

  /** Show tooltip at data points instead of cursor position */
  showTooltip?: boolean

  /** Custom tooltip formatter function */
  tooltipFormatter?: (params: TooltipComponentFormatterCallbackParams) => string
}

export interface ResponsiveAxisConfig {
  xAxisSplitNumber: number
  yAxisSplitNumber: number
  showAxisLabels: boolean
  fontSize: number
  xAxisRotate: number
  xAxisInterval: number | 'auto' | ((index: number, value: string) => boolean)
  isCompactTimeFormat: boolean
  isVeryCompactTimeFormat: boolean
  shouldHideSeconds: boolean
}

export interface CssVars {
  '--stroke': string
  '--stroke-active': string
  '--fg': string
  '--fg-secondary': string
  '--fg-tertiary': string
  '--bg-1': string
  '--bg-hover': string
  '--bg-highlight': string
  '--bg-inverted': string
  '--font-mono': string
  '--accent-error-highlight': string
  '--accent-error-bg': string
  '--accent-warning-highlight': string
  '--accent-warning-bg': string
  '--accent-positive-highlight': string
  [key: string]: string
}

export interface UpdateAxisPointerEvent {
  axesInfo?: Array<{
    axisDim?: string
    value?: number
  }>
}

export interface DataZoomEvent {
  batch?: Array<{
    startValue?: number
    endValue?: number
  }>
}

export type TooltipFormatterParams = TooltipComponentFormatterCallbackParams

export type TooltipFormatterParamsArray =
  | TooltipFormatterParams
  | TooltipFormatterParams[]
