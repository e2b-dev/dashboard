import type { TRPCRouterOutputs } from '@/trpc/client'
import type { StatsChartPoint } from './stats-chart'
import type { WebhookStatsRangeBounds } from './stats-range'

type WebhookDeliveryStats =
  TRPCRouterOutputs['webhooks']['getDeliveryStats']['stats']

type WebhookDeliveryStatsBucket = WebhookDeliveryStats['buckets'][number]
type DeliveryCountMetric = 'failed' | 'total'
type ResponseTimeMetric = 'avg' | 'max' | 'min'

// Builds delivery count points from API buckets, e.g. 10m buckets -> chart points with missing buckets filled as 0.
const getDeliveryCountSeriesData = (
  buckets: WebhookDeliveryStatsBucket[],
  rangeBounds: WebhookStatsRangeBounds,
  bucketIntervalSeconds: number,
  metric: DeliveryCountMetric = 'total'
) => {
  const countByTimestamp = new Map<number, number>()
  const intervalMs = bucketIntervalSeconds * 1000

  for (const bucket of buckets) {
    const count = metric === 'failed' ? bucket.failed : bucket.total
    const timestampMs = new Date(bucket.timestamp).getTime()
    countByTimestamp.set(timestampMs, count)
  }

  const points: StatsChartPoint[] = []
  const start = Math.floor(rangeBounds.start / intervalMs) * intervalMs
  const end = Math.floor(rangeBounds.end / intervalMs) * intervalMs

  for (let timestampMs = start; timestampMs <= end; timestampMs += intervalMs) {
    const value = countByTimestamp.get(timestampMs) ?? 0

    points.push({
      synthetic: value === 0,
      timestamp: new Date(timestampMs).toISOString(),
      value,
    })
  }

  return points
}

const hideInactiveZeroValuePoints = (
  points: StatsChartPoint[],
  nearbyOffsets = [-2, -1, 1, 2]
) =>
  points.map((point, index) => {
    if (point.value !== 0) return point

    const hasNearbyValue = nearbyOffsets.some(
      (offset) => (points[index + offset]?.value ?? 0) > 0
    )
    if (hasNearbyValue) return point

    return { ...point, synthetic: true, value: null }
  })

// Builds response-time points from API buckets, e.g. a bucket average -> one chart point.
const getResponseTimeSeriesData = (
  buckets: WebhookDeliveryStatsBucket[],
  rangeBounds: WebhookStatsRangeBounds,
  metric: ResponseTimeMetric
) => {
  const baseline: StatsChartPoint = {
    synthetic: true,
    timestamp: new Date(rangeBounds.start).toISOString(),
    value: 0,
  }
  const bucketPoints = buckets.flatMap((bucket) => {
    if (bucket.total <= 0) return []

    const value =
      metric === 'avg'
        ? bucket.durationMs.average
        : metric === 'max'
          ? bucket.durationMs.maximum
          : bucket.durationMs.minimum

    return [
      {
        timestamp: bucket.timestamp,
        value,
      },
    ]
  })

  return [
    baseline,
    ...bucketPoints.sort(
      (left, right) =>
        new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
    ),
  ]
}

export {
  getDeliveryCountSeriesData,
  getResponseTimeSeriesData,
  hideInactiveZeroValuePoints,
}
