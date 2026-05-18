'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { useQueryStates } from 'nuqs'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { type TRPCRouterOutputs, useTRPC } from '@/trpc/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import { WebhookRangeSelector } from './range-selector'
import {
  getValidWebhookStatsBounds,
  getWebhookStatsApiBounds,
  getWebhookStatsRange,
  getWebhookStatsRangeFromBounds,
  type WebhookStatsRange,
  type WebhookStatsRangeBounds,
  webhookStatsTimeframeParams,
} from './stats-range'
import {
  WebhookStatsChart,
  type WebhookStatsChartSeries,
} from './webhook-stats-chart'

type WebhookOverviewContentProps = {
  teamSlug: string
  webhookId: string
  initialRangeBounds: WebhookStatsRangeBounds
}

type MetricCardProps = {
  label: string
  value: string
  description: string
}

type ChartCardProps = {
  children: ReactNode
  title: string
}

type DeliveryAttempt =
  TRPCRouterOutputs['webhooks']['listDeliveries']['groups'][number]['attempts'][number]

type ResponseTimeBucketStats = {
  count: number
  maxDurationMs: number
  minDurationMs: number
  totalDurationMs: number
}

const MetricCard = ({ label, value, description }: MetricCardProps) => (
  <Card variant="layer">
    <CardHeader className="p-4 pb-2">
      <CardDescription className="uppercase prose-label">
        {label}
      </CardDescription>
      <CardTitle className="font-mono text-[28px] leading-none tracking-[-0.04em]">
        {value}
      </CardTitle>
    </CardHeader>
    <CardContent className="p-4 pt-0">
      <p className="text-fg-tertiary prose-body">{description}</p>
    </CardContent>
  </Card>
)

const EmptyChartState = ({ label }: { label: string }) => (
  <div className="flex h-[260px] items-center justify-center border border-dashed border-stroke text-fg-tertiary prose-body">
    {label}
  </div>
)

const ChartCard = ({ children, title }: ChartCardProps) => (
  <section className="flex min-w-0 flex-col overflow-hidden border border-stroke bg-bg">
    <div className="border-b px-4 py-3">
      <h3 className="text-fg prose-label-highlight uppercase">{title}</h3>
    </div>
    <div className="p-4">{children}</div>
  </section>
)

const getAttemptsFromGroups = (
  groups: TRPCRouterOutputs['webhooks']['listDeliveries']['groups']
) =>
  groups
    .flatMap((group) => group.attempts)
    .sort(
      (left, right) =>
        new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
    )

const getAttemptStats = (attempts: DeliveryAttempt[]) => {
  const total = attempts.length
  const failed = attempts.filter(
    (attempt) => attempt.deliveryStatus === 'failed'
  ).length
  const durations = attempts.map((attempt) => attempt.durationMs)
  const durationTotal = durations.reduce((sum, value) => sum + value, 0)

  return {
    total,
    failed,
    successful: total - failed,
    minDurationMs: durations.length > 0 ? Math.min(...durations) : 0,
    avgDurationMs: durations.length > 0 ? durationTotal / durations.length : 0,
    maxDurationMs: durations.length > 0 ? Math.max(...durations) : 0,
  }
}

// Picks a chart bucket size from the selected range, e.g. 7 days -> 1 hour.
const getDeliveryBucketSizeMs = ({ start, end }: WebhookStatsRangeBounds) => {
  const rangeMs = end - start

  if (rangeMs <= 4 * 60 * 60 * 1000) return 60 * 1000
  if (rangeMs <= 12 * 60 * 60 * 1000) return 5 * 60 * 1000
  if (rangeMs <= 24 * 60 * 60 * 1000) return 15 * 60 * 1000

  return 60 * 60 * 1000
}

// Buckets a timestamp by duration, e.g. 14:01:52 + 1h -> 14:00:00.
const getBucketTimestamp = (timestampMs: number, bucketSizeMs: number) => {
  return new Date(Math.floor(timestampMs / bucketSizeMs) * bucketSizeMs)
}

const getDeliveryCountSeriesData = (
  attempts: DeliveryAttempt[],
  bucketSizeMs: number,
  rangeBounds: WebhookStatsRangeBounds,
  status?: DeliveryAttempt['deliveryStatus']
) => {
  const countByBucketTimestamp = new Map<string, number>()

  for (const attempt of attempts) {
    if (status && attempt.deliveryStatus !== status) continue

    const timestamp = getBucketTimestamp(
      new Date(attempt.timestamp).getTime(),
      bucketSizeMs
    ).toISOString()

    countByBucketTimestamp.set(
      timestamp,
      (countByBucketTimestamp.get(timestamp) ?? 0) + 1
    )
  }

  const bucketStart = getBucketTimestamp(rangeBounds.start, bucketSizeMs)
  const points = []

  for (
    let timestamp = bucketStart.getTime();
    timestamp <= rangeBounds.end;
    timestamp += bucketSizeMs
  ) {
    const bucketTimestamp = new Date(timestamp).toISOString()
    points.push({
      timestamp: bucketTimestamp,
      value: countByBucketTimestamp.get(bucketTimestamp) ?? 0,
    })
  }

  return points
}

// Keeps line spikes visible while hiding the zero baseline, e.g. [0, 3, 0, 0] -> [0, 3, 0, null].
const getFailedDeliveryLineData = (
  points: ReturnType<typeof getDeliveryCountSeriesData>
) =>
  points.map((point, index) => {
    if (point.value > 0) return point

    const previousPoint = points[index - 1]
    const nextPoint = points[index + 1]
    const isNextToFailure =
      (previousPoint?.value ?? 0) > 0 || (nextPoint?.value ?? 0) > 0

    return {
      ...point,
      value: isNextToFailure ? 0 : null,
    }
  })

const getResponseTimeSeriesData = (
  attempts: DeliveryAttempt[],
  bucketSizeMs: number,
  rangeBounds: WebhookStatsRangeBounds,
  metric: 'avg' | 'max' | 'min'
) => {
  const statsByBucketTimestamp = new Map<string, ResponseTimeBucketStats>()

  for (const attempt of attempts) {
    const timestamp = getBucketTimestamp(
      new Date(attempt.timestamp).getTime(),
      bucketSizeMs
    ).toISOString()
    const currentStats = statsByBucketTimestamp.get(timestamp)

    statsByBucketTimestamp.set(
      timestamp,
      currentStats
        ? {
            count: currentStats.count + 1,
            maxDurationMs: Math.max(
              currentStats.maxDurationMs,
              attempt.durationMs
            ),
            minDurationMs: Math.min(
              currentStats.minDurationMs,
              attempt.durationMs
            ),
            totalDurationMs: currentStats.totalDurationMs + attempt.durationMs,
          }
        : {
            count: 1,
            maxDurationMs: attempt.durationMs,
            minDurationMs: attempt.durationMs,
            totalDurationMs: attempt.durationMs,
          }
    )
  }

  const bucketStart = getBucketTimestamp(rangeBounds.start, bucketSizeMs)
  const points = []
  let hasSeenValue = false
  let hasAddedBaseline = false

  for (
    let timestamp = bucketStart.getTime();
    timestamp <= rangeBounds.end;
    timestamp += bucketSizeMs
  ) {
    const bucketTimestamp = new Date(timestamp).toISOString()
    const stats = statsByBucketTimestamp.get(bucketTimestamp)
    const value = stats
      ? metric === 'avg'
        ? stats.totalDurationMs / stats.count
        : metric === 'max'
          ? stats.maxDurationMs
          : stats.minDurationMs
      : null

    if (value !== null) {
      hasSeenValue = true
    }

    points.push({
      synthetic: value === null && !hasSeenValue && !hasAddedBaseline,
      timestamp: bucketTimestamp,
      value: value ?? (!hasSeenValue && !hasAddedBaseline ? 0 : null),
    })
    if (!hasSeenValue) hasAddedBaseline = true
  }

  return points
}

export const WebhookOverviewContent = ({
  teamSlug,
  webhookId,
  initialRangeBounds,
}: WebhookOverviewContentProps) => {
  const [timeframeParams, setTimeframeParams] = useQueryStates(
    webhookStatsTimeframeParams,
    {
      history: 'push',
      shallow: true,
    }
  )
  const rangeBounds = useMemo(
    () =>
      getValidWebhookStatsBounds({
        start: timeframeParams.start ?? initialRangeBounds.start,
        end: timeframeParams.end ?? initialRangeBounds.end,
      }),
    [timeframeParams.start, timeframeParams.end, initialRangeBounds]
  )
  const apiRangeBounds = useMemo(
    () => getWebhookStatsApiBounds(rangeBounds),
    [rangeBounds]
  )
  const range = getWebhookStatsRangeFromBounds(rangeBounds)
  const trpc = useTRPC()
  const { data } = useSuspenseQuery(
    trpc.webhooks.listDeliveries.queryOptions({
      teamSlug,
      webhookId,
      limit: 100,
      orderAsc: true,
      ...apiRangeBounds,
    })
  )
  const attempts = useMemo(
    () => getAttemptsFromGroups(data.groups),
    [data.groups]
  )
  const stats = getAttemptStats(attempts)
  const failureRate =
    stats.total > 0
      ? `${((stats.failed / stats.total) * 100).toFixed(1)}%`
      : '0%'
  const hasAttempts = attempts.length > 0
  const rangeStartMs = rangeBounds.start
  const rangeEndMs = rangeBounds.end
  const deliveryBucketSizeMs = getDeliveryBucketSizeMs(rangeBounds)
  const deliverySeries = [
    {
      name: 'Total deliveries',
      colorVar: '--accent-info-highlight',
      z: 1,
      data: getDeliveryCountSeriesData(
        attempts,
        deliveryBucketSizeMs,
        rangeBounds
      ),
    },
    {
      name: 'Failed deliveries',
      colorVar: '--accent-error-highlight',
      z: 2,
      data: getFailedDeliveryLineData(
        getDeliveryCountSeriesData(
          attempts,
          deliveryBucketSizeMs,
          rangeBounds,
          'failed'
        )
      ),
    },
  ] satisfies WebhookStatsChartSeries[]
  const latencySeries = [
    {
      name: 'Min response time',
      colorVar: '--accent-info-highlight',
      connectNulls: true,
      lineWidth: 2,
      showSymbol: true,
      z: 1,
      data: getResponseTimeSeriesData(
        attempts,
        deliveryBucketSizeMs,
        rangeBounds,
        'min'
      ),
    },
    {
      name: 'Avg response time',
      colorVar: '--accent-main-highlight',
      connectNulls: true,
      lineWidth: 2,
      showSymbol: true,
      z: 3,
      data: getResponseTimeSeriesData(
        attempts,
        deliveryBucketSizeMs,
        rangeBounds,
        'avg'
      ),
    },
    {
      name: 'Max response time',
      colorVar: '--accent-warning-highlight',
      connectNulls: true,
      lineWidth: 2,
      showSymbol: true,
      z: 2,
      data: getResponseTimeSeriesData(
        attempts,
        deliveryBucketSizeMs,
        rangeBounds,
        'max'
      ),
    },
  ] satisfies WebhookStatsChartSeries[]
  const handleRangeChange = (nextRange: WebhookStatsRange) => {
    setTimeframeParams(getWebhookStatsRange(nextRange))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-3 md:p-6">
      <div className="flex">
        <WebhookRangeSelector value={range} onChange={handleRangeChange} />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          label="Deliveries"
          value={stats.total.toLocaleString()}
          description={`${stats.successful.toLocaleString()} successful`}
        />
        <MetricCard
          label="Failed"
          value={stats.failed.toLocaleString()}
          description={`${failureRate} failure rate`}
        />
        <MetricCard
          label="Avg latency"
          value={`${Math.round(stats.avgDurationMs).toLocaleString()}ms`}
          description="Across all attempts"
        />
        <MetricCard
          label="Max latency"
          value={`${stats.maxDurationMs.toLocaleString()}ms`}
          description={`Min ${stats.minDurationMs.toLocaleString()}ms`}
        />
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2">
        <ChartCard title="Event deliveries">
          {hasAttempts ? (
            <WebhookStatsChart
              series={deliverySeries}
              chartType="line"
              xAxisMin={rangeStartMs}
              xAxisMax={rangeEndMs}
            />
          ) : (
            <EmptyChartState label="No delivery data for this range" />
          )}
        </ChartCard>

        <ChartCard title="Response time">
          {hasAttempts ? (
            <WebhookStatsChart
              series={latencySeries}
              xAxisMin={rangeStartMs}
              xAxisMax={rangeEndMs}
              chartType="line"
              valueFormatter={(value) => `${value.toLocaleString()}ms`}
            />
          ) : (
            <EmptyChartState label="No latency data for this range" />
          )}
        </ChartCard>
      </div>
    </div>
  )
}
