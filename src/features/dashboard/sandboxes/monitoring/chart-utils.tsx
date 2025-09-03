import { formatAveragingPeriod } from '@/lib/utils/formatting'
import { LineSeries } from '@/ui/data/line-chart.utils'
import { SingleValueTooltip } from '@/ui/data/tooltips'
import * as echarts from 'echarts'
import { renderToString } from 'react-dom/server'

/**
 * Calculate average value from line chart data
 */
export function calculateAverage(
  data: Array<{ x: unknown; y: number | null }>
) {
  if (!data.length) return 0
  return data.reduce((acc, cur) => acc + (cur.y || 0), 0) / data.length
}

/**
 * Create a tooltip formatter for single value charts
 */
export function createSingleValueTooltipFormatter({
  step,
  label,
  valueClassName,
  descriptionClassName = 'text-fg-tertiary opacity-75',
  timestampClassName = 'text-fg-tertiary',
}: {
  step: number
  label: string | ((value: number) => string)
  valueClassName: string
  descriptionClassName?: string
  timestampClassName?: string
}) {
  return (params: echarts.TooltipComponentFormatterCallbackParams) => {
    const paramsData = Array.isArray(params) ? params[0] : params
    if (!paramsData?.value) return ''

    const value = Array.isArray(paramsData.value)
      ? paramsData.value[1]
      : paramsData.value
    const timestamp = Array.isArray(paramsData.value)
      ? (paramsData.value[0] as string)
      : (paramsData.value as string)

    const displayLabel =
      typeof label === 'function' && typeof value === 'number'
        ? label(value)
        : label

    return renderToString(
      <SingleValueTooltip
        value={typeof value === 'number' ? value : 'n/a'}
        label={displayLabel as string}
        timestamp={timestamp}
        description={formatAveragingPeriod(step)}
        classNames={{
          value: valueClassName,
          description: descriptionClassName,
          timestamp: timestampClassName,
        }}
      />
    )
  }
}

/**
 * Calculate Y-axis max value for consistent scaling
 */
export function calculateYAxisMax(
  data: Array<{ y: number | null }>,
  limit?: number,
  scaleFactor: number = 1.25
): number {
  const maxDataValue = Math.max(...data.map((d) => d.y || 0))
  const scaledValue = maxDataValue * scaleFactor

  if (limit !== undefined) {
    return Math.min(scaledValue, limit)
  }

  return Math.round(scaledValue)
}

/**
 * Common chart options for monitoring charts
 */
export function createMonitoringChartOptions({
  timeframe,
  splitNumber = 3,
}: {
  timeframe: { start: number; end: number }
  splitNumber?: number
}) {
  return {
    xAxis: {
      type: 'time' as const,
      min: timeframe.start,
      max: timeframe.end,
    },
    yAxis: {
      splitNumber,
    },
    tooltip: {
      show: true,
      trigger: 'axis' as const,
      axisPointer: {
        type: 'line' as const,
      },
    },
  }
}

/**
 * Transform metrics data to line chart format
 */
export function transformMetricsToLineData<T>(
  metrics: T[],
  getTimestamp: (item: T) => number | Date,
  getValue: (item: T) => number | null
): Array<{ x: number | Date; y: number | null }> {
  return metrics.map((item) => ({
    x: getTimestamp(item),
    y: getValue(item),
  }))
}

/**
 * Create chart series configuration
 */
export function createChartSeries({
  id,
  name,
  data,
  lineColor,
  areaColors,
}: {
  id: string
  name: string
  data: Array<{ x: number | Date; y: number | null }>
  lineColor: string
  areaColors?: {
    from: string
    to: string
  }
}) {
  const series: LineSeries = {
    id,
    name,
    data: data.map((d) => ({ x: d.x, y: d.y || 0 })),
    lineStyle: {
      color: lineColor,
    },
  }

  if (areaColors) {
    series.areaStyle = {
      color: {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          {
            offset: 0,
            color: areaColors.from,
          },
          {
            offset: 1,
            color: areaColors.to,
          },
        ],
      },
    }
  }

  return series
}
