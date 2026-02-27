import { useMemo } from 'react'
import type { TeamMetricsResponse } from '@/app/api/teams/[teamId]/metrics/types'
import { formatCompactDate, formatDecimal } from '@/lib/utils/formatting'
import { transformMetrics } from '../team-metrics-chart'
import { calculateAverage } from '../team-metrics-chart/utils'

interface HoveredValue {
  timestamp: number
  concurrentSandboxes?: number
  sandboxStartRate?: number
}

export function useStartRateChartData(data: TeamMetricsResponse | undefined) {
  return useMemo(() => {
    if (!data?.metrics) return []
    return transformMetrics(data.metrics, 'sandboxStartRate')
  }, [data?.metrics])
}

export function useStartRateDisplayMetric(
  chartData: ReturnType<typeof transformMetrics>,
  hoveredValue: HoveredValue | null
) {
  const centralValue = useMemo(() => calculateAverage(chartData), [chartData])

  return useMemo(() => {
    if (hoveredValue?.sandboxStartRate !== undefined) {
      const formattedDate = formatCompactDate(hoveredValue.timestamp)
      return {
        displayValue: formatDecimal(hoveredValue.sandboxStartRate, 3),
        label: 'at',
        timestamp: formattedDate,
      }
    }
    return {
      displayValue: formatDecimal(centralValue, 3),
      label: 'average',
      timestamp: null,
    }
  }, [hoveredValue, centralValue])
}
