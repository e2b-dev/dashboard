import { useMemo } from 'react'
import type { TeamMetricsResponse } from '@/app/api/teams/[teamId]/metrics/types'
import { formatCompactDate, formatNumber } from '@/lib/utils/formatting'
import { formatTimeframeAsISO8601Interval } from '@/lib/utils/timeframe'
import { transformMetrics } from '../team-metrics-chart'
import { calculateAverage } from '../team-metrics-chart/utils'
import { findMatchingChartRange, findMatchingTimeOption } from './utils'

interface HoveredValue {
  timestamp: number
  concurrentSandboxes?: number
  sandboxStartRate?: number
}

interface Timeframe {
  start: number
  end: number
  isLive: boolean
  duration: number
}

export function useConcurrentChartData(data: TeamMetricsResponse | undefined) {
  return useMemo(() => {
    if (!data?.metrics) return []
    return transformMetrics(data.metrics, 'concurrentSandboxes')
  }, [data?.metrics])
}

export function useDisplayMetric(
  chartData: ReturnType<typeof transformMetrics>,
  hoveredValue: HoveredValue | null
) {
  const centralValue = useMemo(() => calculateAverage(chartData), [chartData])

  return useMemo(() => {
    if (hoveredValue?.concurrentSandboxes !== undefined) {
      const formattedDate = formatCompactDate(hoveredValue.timestamp)
      return {
        displayValue: formatNumber(hoveredValue.concurrentSandboxes),
        label: 'at',
        timestamp: formattedDate,
      }
    }
    return {
      displayValue: formatNumber(centralValue),
      label: 'average',
      timestamp: null,
    }
  }, [hoveredValue, centralValue])
}

export function useTimeRangeDisplay(timeframe: Timeframe) {
  const currentRange = useMemo(
    () => findMatchingChartRange(timeframe.duration),
    [timeframe.duration]
  )

  const matchingTimeOption = useMemo(
    () => findMatchingTimeOption(timeframe.duration, timeframe.isLive),
    [timeframe.duration, timeframe.isLive]
  )

  const customRangeLabel = useMemo(() => {
    // show preset label if it matches a time option
    if (matchingTimeOption && timeframe.isLive) {
      return matchingTimeOption.label
    }

    // show timestamps for static mode or true custom ranges
    if (!timeframe.isLive || currentRange === 'custom') {
      return `${formatCompactDate(timeframe.start)} - ${formatCompactDate(timeframe.end)}`
    }

    return null
  }, [
    matchingTimeOption,
    currentRange,
    timeframe.start,
    timeframe.end,
    timeframe.isLive,
  ])

  const customRangeCopyValue = useMemo(() => {
    if (!timeframe.isLive || currentRange === 'custom' || matchingTimeOption) {
      return formatTimeframeAsISO8601Interval(timeframe.start, timeframe.end)
    }
    return null
  }, [
    currentRange,
    timeframe.start,
    timeframe.end,
    timeframe.isLive,
    matchingTimeOption,
  ])

  return {
    currentRange,
    matchingTimeOption,
    customRangeLabel,
    customRangeCopyValue,
  }
}
