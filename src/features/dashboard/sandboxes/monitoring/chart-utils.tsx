import { calculateTeamMetricsStep } from '@/configs/mock-data'
import { formatAveragingPeriod } from '@/lib/utils/formatting'
import { ClientTeamMetrics } from '@/types/sandboxes.types'
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
  splitNumber = 2,
}: {
  timeframe: { start: number; end: number; isLive: boolean }
  splitNumber?: number
}) {
  return {
    xAxis: {
      type: 'time' as const,
      min: timeframe.start,
      max:
        timeframe.end +
        (timeframe.isLive
          ? calculateTeamMetricsStep(timeframe.start, timeframe.end)
          : 0),
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

/**
 * Fill gaps in team metrics with zeros for charting
 * Detects anomalous gaps and adds zeros at start/end and between data waves
 * The step parameter is the expected/display step - we detect when actual data
 * intervals are larger than this and fill the gaps
 */
export function fillMetricsWithZeros(
  data: ClientTeamMetrics,
  start: number,
  end: number,
  step: number,
  anomalousGapTolerance: number = 0.1
): ClientTeamMetrics {
  if (!data.length) {
    // calculate appropriate step for empty data
    const calculatedStep =
      step > 0 ? step : calculateTeamMetricsStep(start, end)
    const result: ClientTeamMetrics = []

    // fill entire range with zeros at calculated step
    for (let timestamp = start; timestamp < end; timestamp += calculatedStep) {
      result.push({
        timestamp,
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      })
    }

    // ensure we have a point at the end
    if (
      result.length === 0 ||
      result[result.length - 1]!.timestamp < end - 1000
    ) {
      result.push({
        timestamp: end - 1000,
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      })
    }

    return result
  }

  if (data.length < 2) {
    return [...data].sort((a, b) => a.timestamp - b.timestamp)
  }

  const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp)
  const result: ClientTeamMetrics = []

  // check if we should add zeros at the start
  const firstDataPoint = sortedData[0]!
  const gapFromStart = firstDataPoint.timestamp - start
  const isStartAnomalous = gapFromStart > step * (1 + anomalousGapTolerance)

  if (isStartAnomalous) {
    result.push({
      timestamp: start,
      concurrentSandboxes: 0,
      sandboxStartRate: 0,
    })

    const prefixZeroTimestamp = firstDataPoint.timestamp - step
    if (
      prefixZeroTimestamp > start &&
      prefixZeroTimestamp < firstDataPoint.timestamp
    ) {
      result.push({
        timestamp: prefixZeroTimestamp,
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      })
    }
  }

  // add data points and fill gaps between ALL points
  // this is key: we use the expected step to detect anomalies,
  // not the actual data interval (which might be wrong)
  for (let i = 0; i < sortedData.length; i++) {
    const currentPoint = sortedData[i]!
    result.push(currentPoint)

    if (i === sortedData.length - 1) {
      break
    }

    const nextPoint = sortedData[i + 1]!
    const actualGap = nextPoint.timestamp - currentPoint.timestamp

    // detect gaps based on EXPECTED step, not actual data intervals
    // this is crucial: if API returns 1-hour intervals but we expect 5 minutes,
    // we need to detect this as anomalous and fill the gaps
    const tolerance = step * anomalousGapTolerance
    const isAnomalousGap = actualGap > step + tolerance

    if (isAnomalousGap) {
      // always fill gaps when detected, even between first points
      // this handles the case where API returns 1-hour intervals
      // but we expect 5-minute intervals

      // fill zero after the current point
      const suffixZeroTimestamp = currentPoint.timestamp + step
      if (suffixZeroTimestamp < nextPoint.timestamp) {
        result.push({
          timestamp: suffixZeroTimestamp,
          concurrentSandboxes: 0,
          sandboxStartRate: 0,
        })
      }

      // fill zero before the next point
      const prefixZeroTimestamp = nextPoint.timestamp - step
      if (
        prefixZeroTimestamp > currentPoint.timestamp &&
        prefixZeroTimestamp < nextPoint.timestamp
      ) {
        result.push({
          timestamp: prefixZeroTimestamp,
          concurrentSandboxes: 0,
          sandboxStartRate: 0,
        })
      }
    }
  }

  // check if we should add zeros at the end
  const lastDataPoint = sortedData[sortedData.length - 1]!
  const gapToEnd = end - lastDataPoint.timestamp

  // add zeros at end if:
  // 1. there's an anomalous gap based on EXPECTED step
  // 2. OR the gap is more than 3x the expected step (ensures zeros for stale data)
  // 3. OR the gap is more than 5 minutes regardless of step
  const isEndAnomalous = gapToEnd > step * (1 + anomalousGapTolerance)
  const shouldAddEndZeros =
    isEndAnomalous ||
    (step > 0 && gapToEnd >= step * 3) ||
    gapToEnd >= 5 * 60 * 1000

  if (shouldAddEndZeros) {
    const suffixZeroTimestamp = lastDataPoint.timestamp + step
    if (suffixZeroTimestamp < end) {
      result.push({
        timestamp: suffixZeroTimestamp,
        concurrentSandboxes: 0,
        sandboxStartRate: 0,
      })
    }

    result.push({
      timestamp: end - 1000,
      concurrentSandboxes: 0,
      sandboxStartRate: 0,
    })
  }

  return result.sort((a, b) => a.timestamp - b.timestamp)
}
