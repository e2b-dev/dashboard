'use client'

import type { EChartsOption, SeriesOption } from 'echarts'
import { LineChart, ScatterChart } from 'echarts/charts'
import {
  AxisPointerComponent,
  GridComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import { useTheme } from 'next-themes'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCssVars } from '@/lib/hooks/use-css-vars'
import { cn } from '@/lib/utils'
import { calculateAxisMax } from '@/lib/utils/chart'
import { withOpacity } from '../../../sandbox/monitoring/utils/chart-colors'
import type { WebhookStatsRange } from './stats-range'

echarts.use([
  LineChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  AxisPointerComponent,
  SVGRenderer,
])

type StatsChartPoint = {
  synthetic?: boolean
  timestamp: string
  value: number | null
}

type StatsChartSeries = {
  name: string
  data: StatsChartPoint[]
  areaFromOpacity?: number
  areaFromVar?: StatsChartColorVar
  areaToOpacity?: number
  areaToVar?: StatsChartColorVar
  connectNulls?: boolean
  lineWidth?: number
  showSymbol?: boolean
  showArea?: boolean
  z?: number
  colorVar: StatsChartColorVar
}

type StatsChartProps = {
  series: StatsChartSeries[]
  bucketIntervalSeconds?: number
  chartType?: 'line' | 'scatter'
  className?: string
  valueFormatter?: (value: number) => string
  yAxisValueFormatter?: (value: number) => string
  xAxisRange?: WebhookStatsRange
  xAxisMax?: number
  xAxisMin?: number
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const AXIS_LABEL_GRID_GAP = 8
const MONO_AXIS_LABEL_CHAR_WIDTH = 7.2
const CHART_LINE_WIDTH = 1
const CHART_AREA_OPACITY = 1
const CHART_FALLBACK_AREA_OPACITY = 0.18
const CHART_AXIS_LABEL_FONT_SIZE = 12
const MARKER_RIGHT_THRESHOLD_PX = 86
const MARKER_OVERLAP_THRESHOLD_PX = 24
const MARKER_LABEL_VERTICAL_GAP_PX = 20
const MARKER_LABEL_MIN_GAP_PX = 24
const MARKER_LABEL_TOP_CLEARANCE_PX = 28
const MARKER_LABEL_BOTTOM_CLEARANCE_PX = 64

const STATS_CHART_COLOR_VARS = [
  '--accent-info-highlight',
  '--accent-error-highlight',
  '--accent-positive-highlight',
  '--accent-main-highlight',
  '--bg-inverted',
] as const

const STATS_CHART_STYLE_VARS = [
  '--stroke',
  '--bg-1',
  '--font-mono',
  '--fg-tertiary',
] as const

type StatsChartColorVar = (typeof STATS_CHART_COLOR_VARS)[number]

type ChartPointValue = [number, number]

type CrosshairMarker = {
  key: string
  xPx: number
  yPx: number
  valueContent: string
  dotColor: string
  placeValueOnRight: boolean
  labelOffsetYPx: number
  labelYPx: number
}

const formatAxisLabel = (
  value: number,
  range: NonNullable<StatsChartProps['xAxisRange']>,
  bounds: Pick<StatsChartProps, 'xAxisMax' | 'xAxisMin'>
) => {
  const date = new Date(value)

  if (range === 'this-week') {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  const isWholeHour =
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0
  if (!isWholeHour) return ''
  if (bounds.xAxisMin && value < bounds.xAxisMin) return ''
  if (bounds.xAxisMax && value >= bounds.xAxisMax) return ''
  if (range === '12h' && bounds.xAxisMin) {
    const firstWholeHour = Math.ceil(bounds.xAxisMin / HOUR_MS) * HOUR_MS
    if ((value - firstWholeHour) % (2 * HOUR_MS) !== 0) return ''
  }

  return date
    .toLocaleTimeString('en-US', { hour: 'numeric' })
    .replace(/\s/g, '')
}

const getXAxisInterval = ({
  range,
  xAxisMax,
  xAxisMin,
}: Pick<StatsChartProps, 'xAxisMax' | 'xAxisMin'> & {
  range: NonNullable<StatsChartProps['xAxisRange']>
}) => {
  if (range === 'this-week') return DAY_MS
  if (range === '4h') return HOUR_MS
  if (range === '12h') return 2 * HOUR_MS
  if (!xAxisMin || !xAxisMax) return 2 * HOUR_MS

  const rangeMs = xAxisMax - xAxisMin
  if (rangeMs <= 6 * HOUR_MS) return HOUR_MS
  if (rangeMs <= 12 * HOUR_MS) return 2 * HOUR_MS

  return 4 * HOUR_MS
}

const defaultValueFormatter = (value: number) => value.toLocaleString()

const toChartPointValue = (point: StatsChartPoint): ChartPointValue | null => {
  if (point.value === null) return null

  return [new Date(point.timestamp).getTime(), point.value]
}

const getClosestPoint = (
  points: StatsChartPoint[],
  timestampMs: number
): ChartPointValue | null => {
  const values = points
    .map(toChartPointValue)
    .filter((point): point is ChartPointValue => Boolean(point))
  if (values.length === 0) return null

  return values.reduce((closest, point) =>
    Math.abs(point[0] - timestampMs) < Math.abs(closest[0] - timestampMs)
      ? point
      : closest
  )
}

const applyMarkerLabelOffsets = (
  markers: CrosshairMarker[],
  chartHeight: number
): CrosshairMarker[] => {
  const minLabelYPx = MARKER_LABEL_TOP_CLEARANCE_PX
  const maxLabelYPx = Math.max(
    minLabelYPx,
    chartHeight - MARKER_LABEL_BOTTOM_CLEARANCE_PX
  )
  const clampLabelYPx = (value: number) =>
    Math.min(Math.max(value, minLabelYPx), maxLabelYPx)
  const spreadLabels = (nextMarkers: CrosshairMarker[]) => {
    if (nextMarkers.length < 2) return nextMarkers

    const sortedMarkers = [...nextMarkers].sort(
      (a, b) => a.labelYPx - b.labelYPx
    )

    for (let index = 1; index < sortedMarkers.length; index += 1) {
      const previousMarker = sortedMarkers[index - 1]
      const currentMarker = sortedMarkers[index]
      if (!previousMarker || !currentMarker) continue

      currentMarker.labelYPx = Math.max(
        currentMarker.labelYPx,
        previousMarker.labelYPx + MARKER_LABEL_MIN_GAP_PX
      )
    }

    const lastMarker = sortedMarkers.at(-1)
    if (lastMarker && lastMarker.labelYPx > maxLabelYPx) {
      const overflowYPx = lastMarker.labelYPx - maxLabelYPx
      sortedMarkers.forEach((marker) => {
        marker.labelYPx -= overflowYPx
      })
    }

    const firstMarker = sortedMarkers[0]
    if (firstMarker && firstMarker.labelYPx < minLabelYPx) {
      const underflowYPx = minLabelYPx - firstMarker.labelYPx
      sortedMarkers.forEach((marker) => {
        marker.labelYPx += underflowYPx
      })
    }

    const labelYPxByMarkerKey = new Map(
      sortedMarkers.map((marker) => [marker.key, marker.labelYPx])
    )

    return nextMarkers.map((marker) => ({
      ...marker,
      labelYPx: labelYPxByMarkerKey.get(marker.key) ?? marker.labelYPx,
    }))
  }

  if (markers.length < 2) {
    return spreadLabels(
      markers.map((marker) => ({
        ...marker,
        labelYPx: clampLabelYPx(marker.yPx + marker.labelOffsetYPx),
      }))
    )
  }

  const sortedMarkers = [...markers].sort((a, b) => a.yPx - b.yPx)
  const offsetsByMarkerKey = new Map<string, number>()
  let clusterStart = 0

  for (let index = 1; index <= sortedMarkers.length; index += 1) {
    const previousMarker = sortedMarkers[index - 1]
    const currentMarker = sortedMarkers[index]
    if (!previousMarker) continue

    const shouldSplitCluster =
      !currentMarker ||
      Math.abs(currentMarker.yPx - previousMarker.yPx) >
        MARKER_OVERLAP_THRESHOLD_PX
    if (!shouldSplitCluster) continue

    const cluster = sortedMarkers.slice(clusterStart, index)
    const halfIndex = (cluster.length - 1) / 2

    cluster.forEach((marker, clusterIndex) => {
      offsetsByMarkerKey.set(
        marker.key,
        (clusterIndex - halfIndex) * MARKER_LABEL_VERTICAL_GAP_PX
      )
    })

    clusterStart = index
  }

  return spreadLabels(
    markers.map((marker) => {
      const labelOffsetYPx =
        offsetsByMarkerKey.get(marker.key) ?? marker.labelOffsetYPx

      return {
        ...marker,
        labelOffsetYPx,
        labelYPx: clampLabelYPx(marker.yPx + labelOffsetYPx),
      }
    })
  )
}

const getTooltipDayLabel = (date: Date) => {
  const now = new Date()
  const yesterday = new Date()
  yesterday.setDate(now.getDate() - 1)

  if (date.toDateString() === now.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

const formatTooltipTime = (date: Date, showMinutes: boolean) =>
  date
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: showMinutes ? '2-digit' : undefined,
    })
    .replace(/\s/g, '')
    .toLowerCase()

const formatTooltipTimestamp = (
  timestampMs: number,
  range: NonNullable<StatsChartProps['xAxisRange']>
) => {
  const date = new Date(timestampMs)
  const day = getTooltipDayLabel(date)
  if (range === 'this-week') return day

  const time = formatTooltipTime(date, false)

  return `${day}, ${time}`
}

const formatTooltipInterval = (
  startTimestampMs: number,
  bucketIntervalSeconds: number,
  range: NonNullable<StatsChartProps['xAxisRange']>
) => {
  const startDate = new Date(startTimestampMs)
  if (range === 'this-week') return getTooltipDayLabel(startDate)

  const endDate = new Date(startTimestampMs + bucketIntervalSeconds * 1000)
  const showMinutes = bucketIntervalSeconds < HOUR_MS / 1000
  const startTime = formatTooltipTime(startDate, showMinutes)
  const endTime = formatTooltipTime(endDate, showMinutes)

  return `${getTooltipDayLabel(startDate)}, ${startTime} — ${endTime}`
}

const getTooltipSyntheticValue = (param: unknown) => {
  if (!param || typeof param !== 'object') return false
  if (!('data' in param)) return false
  if (!param.data || typeof param.data !== 'object') return false
  if (!('synthetic' in param.data)) return false

  return param.data.synthetic === true
}

const StatsChart = memo(function StatsChart({
  series,
  bucketIntervalSeconds,
  chartType = 'scatter',
  className,
  valueFormatter = defaultValueFormatter,
  yAxisValueFormatter = valueFormatter,
  xAxisRange = 'this-week',
  xAxisMax,
  xAxisMin,
}: StatsChartProps) {
  const chartRef = useRef<ReactEChartsCore | null>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const [hoveredTimestampMs, setHoveredTimestampMs] = useState<number | null>(
    null
  )
  const [chartRevision, setChartRevision] = useState(0)
  const { resolvedTheme } = useTheme()
  const cssVars = useCssVars([
    ...STATS_CHART_COLOR_VARS,
    ...STATS_CHART_STYLE_VARS,
  ] as const)

  const stroke = cssVars['--stroke'] || '#d4d4d4'
  const fgTertiary = cssVars['--fg-tertiary'] || '#666'
  const fontMono = cssVars['--font-mono'] || 'monospace'
  const axisPointerColor = stroke

  const handleChartReady = useCallback((chart: echarts.ECharts) => {
    chartInstanceRef.current = chart
    chart.on('finished', () => setChartRevision((revision) => revision + 1))
  }, [])

  const handleUpdateAxisPointer = useCallback(
    (params: {
      axesInfo?: { value?: unknown }[]
      xAxisInfo?: { value?: unknown }[]
      value?: unknown
    }) => {
      const pointerValue =
        params.axesInfo?.[0]?.value ??
        params.xAxisInfo?.[0]?.value ??
        params.value
      const timestampMs =
        typeof pointerValue === 'number' ? pointerValue : Number(pointerValue)
      if (!Number.isFinite(timestampMs)) return

      setHoveredTimestampMs(Math.floor(timestampMs))
    },
    []
  )

  const handleGlobalOut = useCallback(() => {
    setHoveredTimestampMs(null)
    chartInstanceRef.current?.dispatchAction({ type: 'hideTip' })
    chartInstanceRef.current?.dispatchAction({
      type: 'updateAxisPointer',
      currTrigger: 'leave',
    })
  }, [])

  const option = useMemo<EChartsOption>(() => {
    const values = series.flatMap((item) =>
      item.data.flatMap((point) => (point.value === null ? [] : [point.value]))
    )
    const yAxisMax = calculateAxisMax(values.length > 0 ? values : [0], 1.5)
    const yAxisLabels = [0, yAxisMax / 2, yAxisMax].map(yAxisValueFormatter)
    const yAxisLabelGutter =
      Math.ceil(
        Math.max(...yAxisLabels.map((label) => label.length)) *
          MONO_AXIS_LABEL_CHAR_WIDTH
      ) + AXIS_LABEL_GRID_GAP
    const xAxisInterval = getXAxisInterval({
      range: xAxisRange,
      xAxisMax,
      xAxisMin,
    })

    const chartSeries: SeriesOption[] = series.map((item) => {
      const color = cssVars[item.colorVar] || '#000'
      const areaFrom = item.areaFromVar
        ? (cssVars[item.areaFromVar] ??
          withOpacity(
            color,
            item.areaFromOpacity ?? CHART_FALLBACK_AREA_OPACITY
          ))
        : withOpacity(
            color,
            item.areaFromOpacity ?? CHART_FALLBACK_AREA_OPACITY
          )
      const areaTo = item.areaToVar
        ? (cssVars[item.areaToVar] ??
          withOpacity(color, item.areaToOpacity ?? 0))
        : withOpacity(color, item.areaToOpacity ?? 0)

      return {
        name: item.name,
        type: chartType,
        z: item.z,
        data: item.data.map((point) => ({
          synthetic: point.synthetic,
          value: [new Date(point.timestamp).getTime(), point.value],
        })),
        symbol: chartType === 'line' ? 'none' : 'circle',
        symbolSize: (_value: unknown, params: unknown) =>
          getTooltipSyntheticValue(params) ? 0 : 6,
        showSymbol: item.showSymbol ?? chartType === 'scatter',
        connectNulls: item.connectNulls,
        smooth: false,
        itemStyle: {
          color,
        },
        areaStyle: item.showArea
          ? {
              opacity: CHART_AREA_OPACITY,
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: areaFrom },
                  { offset: 1, color: areaTo },
                ],
              },
            }
          : undefined,
        lineStyle: {
          color,
          width: item.lineWidth ?? CHART_LINE_WIDTH,
        },
        emphasis: {
          disabled: true,
        },
      }
    })

    return {
      backgroundColor: 'transparent',
      animation: false,
      grid: {
        top: 16,
        right: 16,
        bottom: 28,
        left: yAxisLabelGutter,
      },
      tooltip: {
        show: true,
        trigger: 'axis',
        confine: true,
        transitionDuration: 0,
        enterable: false,
        hideDelay: 0,
        backgroundColor: 'transparent',
        borderWidth: 0,
        textStyle: {
          color: 'transparent',
          fontSize: 0,
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: axisPointerColor,
            type: 'solid',
            width: CHART_LINE_WIDTH,
          },
          label: {
            show: false,
          },
        },
        formatter: () => '',
        position: [-9999, -9999],
      },
      xAxis: {
        type: 'time',
        min: xAxisMin,
        max: xAxisMax,
        interval: xAxisInterval,
        boundaryGap: [0, 0],
        axisLine: { show: true, lineStyle: { color: stroke } },
        axisTick: { show: false },
        axisLabel: {
          color: fgTertiary,
          fontFamily: fontMono,
          fontSize: CHART_AXIS_LABEL_FONT_SIZE,
          hideOverlap: true,
          formatter: (value: number) =>
            formatAxisLabel(value, xAxisRange, { xAxisMax, xAxisMin }),
        },
        splitLine: { show: false },
        axisPointer: {
          show: true,
          type: 'line',
          lineStyle: {
            color: stroke,
            type: 'solid',
            width: CHART_LINE_WIDTH,
          },
          snap: false,
          label: {
            show: false,
          },
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: yAxisMax,
        interval: yAxisMax / 2,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          align: 'left',
          color: fgTertiary,
          fontFamily: fontMono,
          fontSize: CHART_AXIS_LABEL_FONT_SIZE,
          interval: 0,
          margin: yAxisLabelGutter,
          formatter: (value: number) => yAxisValueFormatter(value),
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: withOpacity(stroke, 0.7),
            type: 'dashed',
          },
          interval: 0,
        },
        axisPointer: { show: false },
      },
      series: chartSeries,
    }
  }, [
    series,
    chartType,
    cssVars,
    stroke,
    axisPointerColor,
    fgTertiary,
    fontMono,
    yAxisValueFormatter,
    xAxisRange,
    xAxisMax,
    xAxisMin,
  ])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      chartRef.current?.getEchartsInstance().resize()
    })

    return () => cancelAnimationFrame(frame)
  }, [])

  const crosshairMarkers = useMemo<CrosshairMarker[]>(() => {
    void chartRevision

    const chart = chartInstanceRef.current
    if (hoveredTimestampMs === null || !chart || chart.isDisposed()) {
      return []
    }
    const chartHeight = chart.getHeight()

    const markers = series.flatMap((item) => {
      const closestPoint = getClosestPoint(item.data, hoveredTimestampMs)
      if (!closestPoint) return []

      const [timestampMs, value] = closestPoint
      if (
        (xAxisMin !== undefined && timestampMs < xAxisMin) ||
        (xAxisMax !== undefined && timestampMs > xAxisMax)
      ) {
        return []
      }

      const pixel = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
        timestampMs,
        value,
      ])
      if (!Array.isArray(pixel) || pixel.length < 2) return []

      const [xPx, yPx] = pixel
      if (
        typeof xPx !== 'number' ||
        typeof yPx !== 'number' ||
        !Number.isFinite(xPx) ||
        !Number.isFinite(yPx)
      ) {
        return []
      }

      const firstPoint = item.data.map(toChartPointValue).find(Boolean)
      const firstTimestampMs = firstPoint?.[0] ?? null
      const firstPointPixel =
        firstTimestampMs === null
          ? null
          : chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
              firstTimestampMs,
              0,
            ])
      const firstPointXPx =
        Array.isArray(firstPointPixel) && typeof firstPointPixel[0] === 'number'
          ? firstPointPixel[0]
          : null

      return [
        {
          key: `${item.name}-${timestampMs}`,
          xPx,
          yPx,
          valueContent: valueFormatter(value),
          dotColor: cssVars[item.colorVar] || stroke,
          placeValueOnRight:
            firstPointXPx !== null &&
            xPx - firstPointXPx <= MARKER_RIGHT_THRESHOLD_PX,
          labelOffsetYPx: 0,
          labelYPx: yPx,
        },
      ]
    })

    return applyMarkerLabelOffsets(markers, chartHeight)
  }, [
    chartRevision,
    cssVars,
    hoveredTimestampMs,
    series,
    stroke,
    valueFormatter,
    xAxisMax,
    xAxisMin,
  ])

  const xAxisHoverBadge = useMemo(() => {
    void chartRevision

    const chart = chartInstanceRef.current
    if (hoveredTimestampMs === null || !chart || chart.isDisposed()) {
      return null
    }

    const pixel = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
      hoveredTimestampMs,
      0,
    ])
    if (!Array.isArray(pixel) || typeof pixel[0] !== 'number') return null

    return {
      xPx: pixel[0],
      label: bucketIntervalSeconds
        ? formatTooltipInterval(
            hoveredTimestampMs,
            bucketIntervalSeconds,
            xAxisRange
          )
        : formatTooltipTimestamp(hoveredTimestampMs, xAxisRange),
    }
  }, [bucketIntervalSeconds, chartRevision, hoveredTimestampMs, xAxisRange])

  const onEvents = useMemo(
    () => ({
      globalout: handleGlobalOut,
      updateAxisPointer: handleUpdateAxisPointer,
    }),
    [handleGlobalOut, handleUpdateAxisPointer]
  )

  return (
    <div
      className={cn('relative h-full min-h-[260px] min-w-0 w-full', className)}
    >
      <ReactEChartsCore
        ref={chartRef}
        key={resolvedTheme}
        echarts={echarts}
        option={option}
        notMerge
        lazyUpdate={false}
        style={{ width: '100%', height: '100%' }}
        onChartReady={handleChartReady}
        onEvents={onEvents}
        className="h-full w-full"
      />
      {crosshairMarkers.length > 0 || xAxisHoverBadge ? (
        <div className="pointer-events-none absolute inset-0">
          {crosshairMarkers.map((marker) => (
            <div key={marker.key}>
              <div
                className="absolute"
                style={{
                  left: marker.xPx,
                  top: marker.yPx,
                  zIndex: 30,
                }}
              >
                <span
                  className="absolute size-2 -translate-x-1/2 -translate-y-1/2 border border-bg-1"
                  style={{ backgroundColor: marker.dotColor }}
                />
              </div>
              <div
                className="absolute"
                style={{
                  left: marker.xPx,
                  top: marker.labelYPx,
                  zIndex: 30,
                }}
              >
                <div
                  style={{
                    backgroundColor: withOpacity(marker.dotColor, 0.1),
                    borderColor: withOpacity(marker.dotColor, 0.12),
                  }}
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 whitespace-nowrap border text-fg font-mono prose-label-numeric px-2 py-0.5 backdrop-blur-lg',
                    marker.placeValueOnRight ? 'left-2' : 'right-2'
                  )}
                >
                  {marker.valueContent}
                </div>
              </div>
            </div>
          ))}
          {xAxisHoverBadge ? (
            <div
              className="bg-bg font-mono prose-label-numeric absolute bottom-2.75 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 text-fg backdrop-blur-lg"
              style={{
                left: xAxisHoverBadge.xPx,
                borderColor: axisPointerColor,
                zIndex: 20,
              }}
            >
              {xAxisHoverBadge.label}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
})

export { StatsChart, type StatsChartPoint, type StatsChartSeries }
