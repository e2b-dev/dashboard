import type { TRPCRouterOutputs } from '@/trpc/client'
import type { StatsChartPoint } from './stats-chart'
import type { WebhookStatsRangeBounds } from './stats-range'

type WebhookDeliveryStats =
  TRPCRouterOutputs['webhooks']['getDeliveryStats']['stats']

type ResponseTimeTimestampStats = {
  count: number
  maxDurationMs: number
  minDurationMs: number
  timestampMs: number
  totalDurationMs: number
}

type WebhookStatsGrouping = 'day' | 'timestamp'
type WebhookDeliveryStatsBucket = WebhookDeliveryStats['buckets'][number]
type WebhookDeliveryStatus = 'failed'

const DAY_MS = 24 * 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

const getStartOfDay = (timestampMs: number) => {
  const date = new Date(timestampMs)
  date.setHours(0, 0, 0, 0)

  return date.getTime()
}

const getSeriesTimestamp = (
  timestamp: string,
  grouping: WebhookStatsGrouping
) => {
  const timestampMs = new Date(timestamp).getTime()
  if (grouping === 'day') return getStartOfDay(timestampMs)

  return timestampMs
}

// Groups delivery buckets by chart granularity, e.g. minute buckets from one day -> one daily count.
const getDeliveryCountSeriesData = (
  buckets: WebhookDeliveryStatsBucket[],
  rangeBounds: WebhookStatsRangeBounds,
  grouping: WebhookStatsGrouping,
  status?: WebhookDeliveryStatus
) => {
  const countByTimestamp = new Map<
    number,
    { count: number; timestampMs: number }
  >()

  for (const bucket of buckets) {
    const count = status === 'failed' ? bucket.failed : bucket.total
    if (count <= 0) continue

    const timestampMs = getSeriesTimestamp(bucket.timestamp, grouping)
    const bucketTimestampMs =
      grouping === 'day'
        ? timestampMs
        : Math.floor(timestampMs / MINUTE_MS) * MINUTE_MS
    const current = countByTimestamp.get(bucketTimestampMs)

    countByTimestamp.set(bucketTimestampMs, {
      count: (current?.count ?? 0) + count,
      timestampMs: Math.max(current?.timestampMs ?? timestampMs, timestampMs),
    })
  }

  if (grouping === 'day') {
    const points = []
    const start = getStartOfDay(rangeBounds.start)
    const end = getStartOfDay(rangeBounds.end)

    for (let timestampMs = start; timestampMs <= end; timestampMs += DAY_MS) {
      const value = countByTimestamp.get(timestampMs)?.count ?? 0

      points.push({
        synthetic: value === 0,
        timestamp: new Date(timestampMs).toISOString(),
        value,
      })
    }

    return points
  }

  const points: StatsChartPoint[] = [
    {
      synthetic: true,
      timestamp: new Date(rangeBounds.start).toISOString(),
      value: 0,
    },
  ]

  for (const [, bucket] of Array.from(countByTimestamp).sort(
    ([left], [right]) => left - right
  )) {
    const timestampMs = bucket.timestampMs

    points.push(
      {
        synthetic: true,
        timestamp: new Date(
          Math.max(rangeBounds.start, timestampMs - 1)
        ).toISOString(),
        value: 0,
      },
      {
        timestamp: new Date(timestampMs).toISOString(),
        value: bucket.count,
      },
      {
        synthetic: true,
        timestamp: new Date(
          Math.min(rangeBounds.end, timestampMs + 1)
        ).toISOString(),
        value: 0,
      }
    )
  }

  points.push({
    synthetic: true,
    timestamp: new Date(rangeBounds.end).toISOString(),
    value: 0,
  })

  return points
}

// Builds a zero-value baseline for an empty range, e.g. [May 19 10am, May 19 2pm] -> 0 deliveries line.
const getEmptyDeliveryCountSeriesData = (
  rangeBounds: WebhookStatsRangeBounds,
  grouping: WebhookStatsGrouping
) => {
  if (grouping === 'day') {
    const points = []
    const start = getStartOfDay(rangeBounds.start)
    const end = getStartOfDay(rangeBounds.end)

    for (let timestampMs = start; timestampMs <= end; timestampMs += DAY_MS) {
      points.push({
        synthetic: true,
        timestamp: new Date(timestampMs).toISOString(),
        value: 0,
      })
    }

    return points
  }

  return [
    {
      synthetic: true,
      timestamp: new Date(rangeBounds.start).toISOString(),
      value: 0,
    },
    {
      synthetic: true,
      timestamp: new Date(rangeBounds.end).toISOString(),
      value: 0,
    },
  ]
}

const hideInactiveZeroValuePoints = (points: StatsChartPoint[]) =>
  points.map((point, index) => {
    if (point.value !== 0) return point

    const hasNearbyValue = [-2, -1, 1, 2].some(
      (offset) => (points[index + offset]?.value ?? 0) > 0
    )
    if (hasNearbyValue) return point

    return { ...point, synthetic: true, value: null }
  })

// Groups response-time buckets by chart granularity, e.g. minute buckets from one day -> one daily min/avg/max point.
const getResponseTimeSeriesData = (
  buckets: WebhookDeliveryStatsBucket[],
  rangeBounds: WebhookStatsRangeBounds,
  grouping: WebhookStatsGrouping,
  metric: 'avg' | 'max' | 'min'
) => {
  const statsByTimestamp = new Map<number, ResponseTimeTimestampStats>()

  for (const bucket of buckets) {
    if (bucket.total <= 0) continue

    const timestampMs = getSeriesTimestamp(bucket.timestamp, grouping)
    const bucketTimestampMs =
      grouping === 'day'
        ? timestampMs
        : Math.floor(timestampMs / MINUTE_MS) * MINUTE_MS
    const currentStats = statsByTimestamp.get(bucketTimestampMs)
    const durationTotal = bucket.durationMs.average * bucket.total

    statsByTimestamp.set(
      bucketTimestampMs,
      currentStats
        ? {
            count: currentStats.count + bucket.total,
            maxDurationMs: Math.max(
              currentStats.maxDurationMs,
              bucket.durationMs.maximum
            ),
            minDurationMs: Math.min(
              currentStats.minDurationMs,
              bucket.durationMs.minimum
            ),
            timestampMs: Math.max(currentStats.timestampMs, timestampMs),
            totalDurationMs: currentStats.totalDurationMs + durationTotal,
          }
        : {
            count: bucket.total,
            maxDurationMs: bucket.durationMs.maximum,
            minDurationMs: bucket.durationMs.minimum,
            timestampMs,
            totalDurationMs: durationTotal,
          }
    )
  }

  const points: StatsChartPoint[] = [
    {
      synthetic: true,
      timestamp: new Date(rangeBounds.start).toISOString(),
      value: 0,
    },
  ]

  points.push(
    ...Array.from(statsByTimestamp)
      .sort(([left], [right]) => left - right)
      .map(([, stats]) => {
        const value =
          metric === 'avg'
            ? stats.totalDurationMs / stats.count
            : metric === 'max'
              ? stats.maxDurationMs
              : stats.minDurationMs

        return {
          timestamp: new Date(stats.timestampMs).toISOString(),
          value,
        }
      })
  )

  return points
}

export {
  getDeliveryCountSeriesData,
  getEmptyDeliveryCountSeriesData,
  getResponseTimeSeriesData,
  hideInactiveZeroValuePoints,
  type WebhookStatsGrouping,
}
