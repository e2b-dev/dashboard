'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { useQueryStates } from 'nuqs'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { type TRPCRouterOutputs, useTRPC } from '@/trpc/client'
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
  type WebhookStatsChartPoint,
  type WebhookStatsChartSeries,
} from './webhook-stats-chart'

type WebhookOverviewContentProps = {
  teamSlug: string
  webhookId: string
  initialRangeBounds: WebhookStatsRangeBounds
}

type MetricPanelProps = {
  label: string
  value: string
  description: string
}

type ChartPanelProps = {
  children: ReactNode
  title: string
}

type DeliveryAttempt =
  TRPCRouterOutputs['webhooks']['listDeliveries']['groups'][number]['attempts'][number]

type ResponseTimeTimestampStats = {
  count: number
  maxDurationMs: number
  minDurationMs: number
  timestampMs: number
  totalDurationMs: number
}

type WebhookStatsGrouping = 'day' | 'timestamp'

const DAY_MS = 24 * 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

const MetricPanel = ({ label, value, description }: MetricPanelProps) => (
  <section className="p-4 md:p-6">
    <p className="text-fg-tertiary uppercase prose-label">{label}</p>
    <p className="text-fg font-mono text-[28px] leading-none tracking-[-0.04em]">
      {value}
    </p>
    <p className="mt-2 text-fg-tertiary prose-body">{description}</p>
  </section>
)

const ChartPanel = ({ children, title }: ChartPanelProps) => (
  <section className="flex min-w-0 flex-col overflow-hidden p-3 md:p-6">
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-fg uppercase prose-label-highlight max-md:text-sm">
        <span>{title}</span>
      </div>
    </div>
    <div className="mt-3 min-h-0 flex-1 md:mt-4">{children}</div>
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

// Groups delivery attempts by chart granularity, e.g. retries at "14:35:10" -> one "14:35" count.
const getDeliveryCountSeriesData = (
  attempts: DeliveryAttempt[],
  rangeBounds: WebhookStatsRangeBounds,
  grouping: WebhookStatsGrouping,
  status?: DeliveryAttempt['deliveryStatus']
) => {
  const countByTimestamp = new Map<
    number,
    { count: number; timestampMs: number }
  >()

  for (const attempt of attempts) {
    if (status && attempt.deliveryStatus !== status) continue

    const timestampMs = getSeriesTimestamp(attempt.timestamp, grouping)
    const bucketTimestampMs =
      grouping === 'day'
        ? timestampMs
        : Math.floor(timestampMs / MINUTE_MS) * MINUTE_MS
    const current = countByTimestamp.get(bucketTimestampMs)

    countByTimestamp.set(bucketTimestampMs, {
      count: (current?.count ?? 0) + 1,
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

  const points: WebhookStatsChartPoint[] = [
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

// Groups response times by chart granularity, e.g. retries at "14:35:10" -> one "14:35" min/avg/max point.
const getResponseTimeSeriesData = (
  attempts: DeliveryAttempt[],
  rangeBounds: WebhookStatsRangeBounds,
  grouping: WebhookStatsGrouping,
  metric: 'avg' | 'max' | 'min'
) => {
  const statsByTimestamp = new Map<number, ResponseTimeTimestampStats>()

  for (const attempt of attempts) {
    const timestampMs = getSeriesTimestamp(attempt.timestamp, grouping)
    const bucketTimestampMs =
      grouping === 'day'
        ? timestampMs
        : Math.floor(timestampMs / MINUTE_MS) * MINUTE_MS
    const currentStats = statsByTimestamp.get(bucketTimestampMs)

    statsByTimestamp.set(
      bucketTimestampMs,
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
            timestampMs: Math.max(currentStats.timestampMs, timestampMs),
            totalDurationMs: currentStats.totalDurationMs + attempt.durationMs,
          }
        : {
            count: 1,
            maxDurationMs: attempt.durationMs,
            minDurationMs: attempt.durationMs,
            timestampMs,
            totalDurationMs: attempt.durationMs,
          }
    )
  }

  const points: WebhookStatsChartPoint[] = [
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
        const value = stats
          ? metric === 'avg'
            ? stats.totalDurationMs / stats.count
            : metric === 'max'
              ? stats.maxDurationMs
              : stats.minDurationMs
          : null

        return {
          timestamp: new Date(stats.timestampMs).toISOString(),
          value,
        }
      })
  )

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
  const rangeStartMs = rangeBounds.start
  const rangeEndMs = rangeBounds.end
  const grouping: WebhookStatsGrouping =
    range === 'this-week' ? 'day' : 'timestamp'
  const xAxisScale =
    range === '4h'
      ? 'four-hour'
      : range === '12h'
        ? 'twelve-hour'
        : range === 'today'
          ? 'today'
          : 'daily'
  const deliverySeries = [
    {
      name: 'Total deliveries',
      colorVar: '--accent-info-highlight',
      showSymbol: true,
      z: 1,
      data:
        attempts.length > 0
          ? getDeliveryCountSeriesData(attempts, rangeBounds, grouping)
          : getEmptyDeliveryCountSeriesData(rangeBounds, grouping),
    },
    {
      name: 'Failed deliveries',
      colorVar: '--accent-error-highlight',
      showSymbol: true,
      z: 2,
      data:
        attempts.length > 0
          ? getDeliveryCountSeriesData(
              attempts,
              rangeBounds,
              grouping,
              'failed'
            )
          : [],
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
      data: getResponseTimeSeriesData(attempts, rangeBounds, grouping, 'min'),
    },
    {
      name: 'Avg response time',
      colorVar: '--accent-main-highlight',
      connectNulls: true,
      lineWidth: 2,
      showSymbol: true,
      z: 3,
      data: getResponseTimeSeriesData(attempts, rangeBounds, grouping, 'avg'),
    },
    {
      name: 'Max response time',
      colorVar: '--accent-warning-highlight',
      connectNulls: true,
      lineWidth: 2,
      showSymbol: true,
      z: 2,
      data: getResponseTimeSeriesData(attempts, rangeBounds, grouping, 'max'),
    },
  ] satisfies WebhookStatsChartSeries[]
  const handleRangeChange = (nextRange: WebhookStatsRange) => {
    setTimeframeParams(getWebhookStatsRange(nextRange))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex p-3 md:p-6">
        <WebhookRangeSelector value={range} onChange={handleRangeChange} />
      </div>

      <div className="grid border-y border-stroke md:grid-cols-4 md:divide-x md:divide-stroke max-md:divide-y max-md:divide-stroke">
        <MetricPanel
          label="Deliveries"
          value={stats.total.toLocaleString()}
          description={`${stats.successful.toLocaleString()} successful`}
        />
        <MetricPanel
          label="Failed"
          value={stats.failed.toLocaleString()}
          description={`${failureRate} failure rate`}
        />
        <MetricPanel
          label="Avg latency"
          value={`${Math.round(stats.avgDurationMs).toLocaleString()}ms`}
          description="Across all attempts"
        />
        <MetricPanel
          label="Max latency"
          value={`${stats.maxDurationMs.toLocaleString()}ms`}
          description={`Min ${stats.minDurationMs.toLocaleString()}ms`}
        />
      </div>

      <div className="grid flex-1 md:grid-cols-2 md:divide-x md:divide-stroke max-md:divide-y max-md:divide-stroke">
        <ChartPanel title="Event deliveries">
          <WebhookStatsChart
            series={deliverySeries}
            chartType="line"
            xAxisScale={xAxisScale}
            xAxisMin={rangeStartMs}
            xAxisMax={rangeEndMs}
          />
        </ChartPanel>

        <ChartPanel title="Response time">
          <WebhookStatsChart
            series={latencySeries}
            xAxisMin={rangeStartMs}
            xAxisMax={rangeEndMs}
            xAxisScale={xAxisScale}
            chartType="line"
            valueFormatter={(value) => `${value.toLocaleString()}ms`}
          />
        </ChartPanel>
      </div>
    </div>
  )
}
