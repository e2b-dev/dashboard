'use client'

import { useTeamMetrics } from '@/features/dashboard/sandboxes/monitoring/context'
import { useCssVars } from '@/lib/hooks/use-css-vars'
import DefaultTooltip from '@/ui/data/tooltips'
import deepmerge from 'deepmerge'
import * as echarts from 'echarts'
import { EChartsOption } from 'echarts'
import {
  default as EChartsReact,
  default as ReactECharts,
} from 'echarts-for-react'
import { useTheme } from 'next-themes'
import { useEffect, useMemo, useRef } from 'react'
import { renderToString } from 'react-dom/server'
import { Badge } from '../primitives/badge'

type XYValue = string | number | Date

export interface LinePoint {
  x: XYValue
  y: number
}

export interface LineSeries
  extends Partial<Omit<echarts.LineSeriesOption, 'data'>> {
  id: string
  data: LinePoint[]
  name?: string
  curve?: CurveKind
}

type CurveKind = 'linear' | 'monotone' | 'step' | 'stepBefore' | 'stepAfter'

interface AxisFormatters {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  x?: (value: any) => string
  y?: (value: number) => string
}

interface AxisControls {
  showGridX?: boolean
  showGridY?: boolean
  showAxisXLine?: boolean
  showAxisYLine?: boolean
  showAxisXTicks?: boolean
  showAxisYTicks?: boolean
}

interface LayoutControls {
  grid?: { top?: number; right?: number; bottom?: number; left?: number }
}

export interface LineChartProps extends AxisControls, LayoutControls {
  data: LineSeries[]
  curve?: CurveKind
  xType?: 'category' | 'time' | 'value' | 'log'
  format?: AxisFormatters
  className?: string
  style?: React.CSSProperties
  tooltipFormatter?: (
    params: echarts.TooltipComponentFormatterCallbackParams
  ) => string
  optionOverrides?: EChartsOption
  enableDragZoom?: boolean
}

function mapCurveToSeriesOptions(curve?: CurveKind): {
  smooth?: boolean
  step?: false | 'start' | 'end' | 'middle'
} {
  switch (curve) {
    case 'monotone':
      return { smooth: true }
    case 'stepBefore':
      return { smooth: false, step: 'start' }
    case 'stepAfter':
      return { smooth: false, step: 'end' }
    case 'step':
      return { smooth: false, step: 'middle' }
    case 'linear':
    default:
      return { smooth: false }
  }
}

function toXValue(x: XYValue): number | string {
  return x instanceof Date ? x.getTime() : x
}

// deepmerge default concatenates arrays; configure to replace instead to preserve previous behavior
const mergeReplaceArrays = <T,>(target: T, source: Partial<T>): T =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deepmerge(target as any, source as any, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    arrayMerge: (_destinationArray, sourceArray) => sourceArray as any,
  }) as T

export function LineChart({
  data,
  curve,
  xType = 'category',
  format,
  className,
  style,
  optionOverrides,
  tooltipFormatter,
  showGridX,
  showGridY,
  showAxisXLine,
  showAxisYLine,
  showAxisXTicks,
  showAxisYTicks,
  grid,
  enableDragZoom = false,
}: LineChartProps) {
  const ref = useRef<EChartsReact>(null)
  const { setChartsStart, setChartsEnd } = useTeamMetrics()

  const { resolvedTheme } = useTheme()

  const cssVars = useCssVars(
    [
      '--stroke',
      '--stroke-active',
      '--fg',
      '--fg-tertiary',
      '--bg-hover',
      '--font-mono',
    ] as const,
    [resolvedTheme]
  )

  const resolvedFormat: AxisFormatters = useMemo(
    () => ({ x: format?.x, y: format?.y }),
    [format?.x, format?.y]
  )

  const curveOptions = useMemo(() => mapCurveToSeriesOptions(curve), [curve])

  const resolvedSeries = useMemo(() => {
    return data.map(
      (series) =>
        ({
          id: series.id,
          name: series.name ?? series.id,
          type: 'line' as const,
          symbol: () => {
            const svg = `<svg width="9" height="9" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
              <circle cx="4.5" cy="4.5" r="3" fill="${cssVars['--fg']}" stroke="${cssVars['--stroke']}" stroke-width="0.5" />
            </svg>`
            const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`

            return `image://${dataUrl}`
          },
          symbolSize: 8,
          // renders the symbol only on hover, not always
          showSymbol: false,
          lineStyle: {
            width: series.lineStyle?.width ?? 1,
            type: series.lineStyle?.type ?? 'solid',
            color: series.lineStyle?.color ?? cssVars['--fg'],
          },
          areaStyle: series.areaStyle ?? {
            color: cssVars['--fg'],
            opacity: 0.08,
          },
          ...(series.curve
            ? mapCurveToSeriesOptions(series.curve)
            : curveOptions),
          data: series.data.map((p) => [toXValue(p.x), p.y]),
        }) satisfies echarts.LineSeriesOption
    )
  }, [curveOptions, data, cssVars])

  const option = useMemo<EChartsOption>(() => {
    const axisPointerStyle = {
      type: 'line' as const,
      lineStyle: {
        color: cssVars['--stroke'],
        type: 'dashed' as const,
      },
    }

    const base: EChartsOption = {
      backgroundColor: 'transparent',
      grid: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        ...(grid ?? {}),
      },
      dataZoom: enableDragZoom
        ? [
            {
              type: 'inside',
              throttle: 100,
            },
          ]
        : undefined,
      animation: false,
      tooltip: {
        show: true,
        trigger: 'axis',
        confine: true,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        borderRadius: 0,
        padding: 0,
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: 'transparent',
        textStyle: {
          color: cssVars['--fg'],
          fontSize: 14,
          fontWeight: 400,
          lineHeight: 20,
        },
        formatter: tooltipFormatter
          ? tooltipFormatter
          : (params: echarts.TooltipComponentFormatterCallbackParams) => {
              // normalize params to an array
              params = params instanceof Array ? params : [params]
              const first = params[0]!

              const label = (() => {
                const xValue = (first.value as Array<unknown>)?.[
                  first.encode!.x![0]!
                ]
                if (!xValue) return 'n/a'

                if (xType === 'time') {
                  const date = new Date(xValue as number)
                  const day = date.getDate()
                  const month = date.toLocaleDateString('en-US', {
                    month: 'short',
                  })
                  const time = date.toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  return `${day} ${month} - ${time}`
                }

                return xValue.toLocaleString()
              })()

              const items = params.map((p) => ({
                label: (
                  <Badge variant="info" className="uppercase">
                    {p.seriesName ?? 'n/a'}
                  </Badge>
                ),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                value: (p.value as Array<any>)?.[
                  p.encode!.y![0]!
                ]?.toLocaleString(),
              }))

              return renderToString(
                <DefaultTooltip label={label} items={items} />
              )
            },
      },
      xAxis: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: xType as any,
        boundaryGap: xType === 'time' ? [0, 0] : undefined,
        axisLine: {
          show: showAxisXLine ?? true,
          lineStyle: { color: cssVars['--stroke'] },
        },
        axisTick: { show: showAxisXTicks ?? false },
        axisLabel: {
          color: cssVars['--fg-tertiary'],
          formatter: resolvedFormat.x
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (value: any) => resolvedFormat.x!(value)
            : undefined,
          fontSize: 12,
          fontFamily: cssVars['--font-mono'],
          fontWeight: 400,
          lineHeight: 17,
        },
        splitLine: {
          show: showGridX ?? false,
          lineStyle: {
            type: 'dashed',
            color: cssVars['--stroke'],
          },
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: cssVars['--fg-tertiary'],
          formatter: resolvedFormat.y
            ? (value: number) => resolvedFormat.y!(value)
            : undefined,
          fontSize: 12,
          fontFamily: cssVars['--font-mono'],
          fontWeight: 400,
          lineHeight: 17,
        },
        axisPointer: axisPointerStyle,
        axisLine: {
          show: showAxisYLine ?? false,
          lineStyle: { color: cssVars['--stroke'] },
        },
        axisTick: { show: showAxisYTicks ?? false },
        splitLine: {
          show: showGridY ?? true,
          lineStyle: {
            type: 'dashed',
            color: cssVars['--stroke'],
          },
        },
      },
      series: resolvedSeries,
    }

    return optionOverrides ? mergeReplaceArrays(base, optionOverrides) : base
  }, [
    grid,
    optionOverrides,
    resolvedSeries,
    resolvedFormat.x,
    resolvedFormat.y,
    showAxisXLine,
    showAxisXTicks,
    showAxisYLine,
    showAxisYTicks,
    cssVars,
    xType,
    tooltipFormatter,
    showGridX,
    showGridY,
    enableDragZoom,
  ])

  useEffect(() => {
    const echartsInstance = ref.current?.getEchartsInstance?.()
    if (!echartsInstance) return

    if (enableDragZoom) {
      echartsInstance.dispatchAction({
        type: 'takeGlobalCursor',
        key: 'dataZoomSelect',
        dataZoomSelectActive: true,
      })
    } else {
      echartsInstance.dispatchAction({
        type: 'takeGlobalCursor',
        key: 'dataZoomSelect',
        dataZoomSelectActive: false,
      })
    }
  }, [enableDragZoom])

  return (
    <div className={className ?? 'w-full h-full'} style={style}>
      <ReactECharts
        ref={ref}
        key={resolvedTheme}
        option={option}
        notMerge={true}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}

export interface TimeSeriesLineChartProps
  extends Omit<LineChartProps, 'xType'> {
  minimumVisualRangeMs?: number
}

function TimeSeriesLineChart({
  minimumVisualRangeMs = 0,
  ...rest
}: TimeSeriesLineChartProps) {
  const now = useMemo(() => Date.now(), [])
  const min = useMemo(
    () => now - Math.max(0, minimumVisualRangeMs),
    [now, minimumVisualRangeMs]
  )

  const optionOverrides = useMemo<EChartsOption>(
    () => ({
      xAxis: { min, max: now },
    }),
    [min, now]
  )

  return (
    <LineChart
      {...rest}
      xType="time"
      optionOverrides={
        rest.optionOverrides
          ? mergeReplaceArrays(optionOverrides, rest.optionOverrides)
          : optionOverrides
      }
    />
  )
}

export default TimeSeriesLineChart
