import type { TRPCRouterOutputs } from '@/trpc/client'
import type { StatsChartPoint } from './stats-chart'
import type { WebhookStatsRangeBounds } from './stats-range'

type WebhookDeliveryStats =
  TRPCRouterOutputs['webhooks']['getDeliveryStats']['stats']

type WebhookDeliveryStatsBucket = WebhookDeliveryStats['buckets'][number]
type DeliveryCountMetric = 'failed' | 'total'
type ResponseTimeMetric = 'avg' | 'max' | 'min'

const getBucketTimestampRange = (
  rangeBounds: WebhookStatsRangeBounds,
  bucketIntervalSeconds: number
) => {
  const intervalMs = bucketIntervalSeconds * 1000
  const start = Math.ceil(rangeBounds.start / intervalMs) * intervalMs
  const end = Math.floor(rangeBounds.end / intervalMs) * intervalMs

  return { end, intervalMs, start }
}

// Builds delivery count points from API buckets, e.g. 10m buckets -> chart points with missing buckets filled as 0.
const getDeliveryCountSeriesData = (
  buckets: WebhookDeliveryStatsBucket[],
  rangeBounds: WebhookStatsRangeBounds,
  bucketIntervalSeconds: number,
  metric: DeliveryCountMetric = 'total'
) => {
  const countByTimestamp = new Map<number, number>()

  for (const bucket of buckets) {
    const count = metric === 'failed' ? bucket.failed : bucket.total
    const timestampMs = new Date(bucket.timestamp).getTime()
    countByTimestamp.set(timestampMs, count)
  }

  const points: StatsChartPoint[] = []
  const { end, intervalMs, start } = getBucketTimestampRange(
    rangeBounds,
    bucketIntervalSeconds
  )

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

// Builds response-time points from API buckets, e.g. a bucket average -> one chart point.
const getResponseTimeSeriesData = (
  buckets: WebhookDeliveryStatsBucket[],
  rangeBounds: WebhookStatsRangeBounds,
  bucketIntervalSeconds: number,
  metric: ResponseTimeMetric
) => {
  const valueByTimestamp = new Map<number, number>()

  for (const bucket of buckets) {
    if (bucket.total <= 0) continue

    const value =
      metric === 'avg'
        ? bucket.durationMs.average
        : metric === 'max'
          ? bucket.durationMs.maximum
          : bucket.durationMs.minimum

    valueByTimestamp.set(new Date(bucket.timestamp).getTime(), value)
  }

  const points: StatsChartPoint[] = []
  const { end, intervalMs, start } = getBucketTimestampRange(
    rangeBounds,
    bucketIntervalSeconds
  )

  for (let timestampMs = start; timestampMs <= end; timestampMs += intervalMs) {
    const value = valueByTimestamp.get(timestampMs) ?? 0

    points.push({
      synthetic: value === 0,
      timestamp: new Date(timestampMs).toISOString(),
      value,
    })
  }

  return points
}

export { getDeliveryCountSeriesData, getResponseTimeSeriesData }
