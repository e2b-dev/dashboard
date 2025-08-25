import { fillTeamMetricsWithZeros } from '@/lib/utils/sandboxes'
import { ClientTeamMetrics } from '@/types/sandboxes.types'
import { useCallback, useMemo } from 'react'

/**
 * Hook for processing team metrics data to ensure complete time series with zero values
 * for missing timestamps. Uses the fillTeamMetricsWithZeros utility function.
 *
 * Will not fill data points before 2025-08-15T08:15:00Z.
 *
 * @param data - Raw team metrics data from the API
 * @param startTimestamp - Start timestamp in milliseconds
 * @param endTimestamp - End timestamp in milliseconds
 * @returns Complete dataset with zero-filled gaps at regular intervals
 */
export function useFillTeamMetricsData(
  data: ClientTeamMetrics,
  startTimestamp: number,
  endTimestamp: number
) {
  const processMetrics = useCallback(
    (metricsData: typeof data) => {
      // Convert the cutoff date to timestamp in milliseconds
      const cutoffTimestamp = new Date('2025-08-15T08:15:00Z').getTime()

      // Only fill zeros from cutoff date onwards
      const effectiveStartTimestamp = Math.max(startTimestamp, cutoffTimestamp)

      return fillTeamMetricsWithZeros(
        metricsData,
        effectiveStartTimestamp,
        endTimestamp
      )
    },
    [startTimestamp, endTimestamp]
  )

  const processedMetrics = useMemo(
    () => processMetrics(data),
    [processMetrics, data]
  )

  return processedMetrics
}
