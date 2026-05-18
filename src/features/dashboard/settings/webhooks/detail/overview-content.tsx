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
    <div className="border-b p-3 md:px-6">
      <h3 className="text-fg prose-label-highlight uppercase">{title}</h3>
    </div>
    <div className="p-6">{children}</div>
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

// Buckets an ISO timestamp by duration, e.g. "2026-05-13T14:01:52.123Z" + 1h -> "2026-05-13T14:00:00.000Z".
const getBucketTimestamp = (timestamp: string, bucketSizeMs: number) => {
  const time = new Date(timestamp).getTime()
  return new Date(Math.floor(time / bucketSizeMs) * bucketSizeMs).toISOString()
}

const getDeliveryCountSeriesData = (
  attempts: DeliveryAttempt[],
  bucketSizeMs: number,
  status?: DeliveryAttempt['deliveryStatus']
) => {
  const countByBucketTimestamp = new Map<string, number>()

  for (const attempt of attempts) {
    if (status && attempt.deliveryStatus !== status) continue

    const timestamp = getBucketTimestamp(attempt.timestamp, bucketSizeMs)

    countByBucketTimestamp.set(
      timestamp,
      (countByBucketTimestamp.get(timestamp) ?? 0) + 1
    )
  }

  return Array.from(countByBucketTimestamp, ([timestamp, value]) => ({
    timestamp,
    value,
  }))
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
      data: getDeliveryCountSeriesData(attempts, deliveryBucketSizeMs),
    },
    {
      name: 'Failed deliveries',
      colorVar: '--accent-error-highlight',
      data: getDeliveryCountSeriesData(
        attempts,
        deliveryBucketSizeMs,
        'failed'
      ),
    },
  ] satisfies WebhookStatsChartSeries[]
  const latencySeries = [
    {
      name: 'Successful response time',
      colorVar: '--accent-positive-highlight',
      data: attempts
        .filter((attempt) => attempt.deliveryStatus === 'success')
        .map((attempt) => ({
          timestamp: attempt.timestamp,
          value: attempt.durationMs,
        })),
    },
    {
      name: 'Failed response time',
      colorVar: '--accent-error-highlight',
      data: attempts
        .filter((attempt) => attempt.deliveryStatus === 'failed')
        .map((attempt) => ({
          timestamp: attempt.timestamp,
          value: attempt.durationMs,
        })),
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
