'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { useTRPC } from '@/trpc/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/ui/primitives/chart'
import { WebhookRangeSelector } from './range-selector'
import {
  getWebhookStatsRange,
  type WebhookStatsRange,
  type WebhookStatsRangeBounds,
  webhookStatsRangeParams,
} from './stats-range'

type WebhookOverviewContentProps = {
  teamSlug: string
  webhookId: string
  initialRange: WebhookStatsRange
  initialRangeBounds: WebhookStatsRangeBounds
}

type MetricCardProps = {
  label: string
  value: string
  description: string
}

const deliveryChartConfig = {
  total: {
    label: 'Total deliveries',
    color: 'var(--accent-info-highlight)',
  },
  failed: {
    label: 'Failed deliveries',
    color: 'var(--accent-error-highlight)',
  },
} satisfies ChartConfig

const latencyChartConfig = {
  avgDurationMs: {
    label: 'Average duration',
    color: 'var(--accent-positive-highlight)',
  },
} satisfies ChartConfig

const formatBucketLabel = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
  })

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

export const WebhookOverviewContent = ({
  teamSlug,
  webhookId,
  initialRange,
  initialRangeBounds,
}: WebhookOverviewContentProps) => {
  const [rangeParams, setRangeParams] = useQueryStates(
    webhookStatsRangeParams,
    {
      history: 'push',
      shallow: true,
    }
  )
  const range = rangeParams.range ?? initialRange
  const rangeBounds = useMemo(
    () =>
      range === initialRange ? initialRangeBounds : getWebhookStatsRange(range),
    [range, initialRange, initialRangeBounds]
  )
  const trpc = useTRPC()
  const { data } = useSuspenseQuery(
    trpc.webhooks.getDeliveryStats.queryOptions({
      teamSlug,
      webhookId,
      ...rangeBounds,
    })
  )
  const { stats } = data
  const successful = Math.max(stats.total - stats.failed, 0)
  const failureRate =
    stats.total > 0
      ? `${((stats.failed / stats.total) * 100).toFixed(1)}%`
      : '0%'
  const hasBuckets = stats.buckets.length > 0
  const handleRangeChange = (nextRange: WebhookStatsRange) => {
    setRangeParams({ range: nextRange })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-3 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-fg prose-headline-small">Overview</h2>
          <p className="text-fg-tertiary prose-body">
            Delivery health and latency for this webhook.
          </p>
        </div>
        <WebhookRangeSelector value={range} onChange={handleRangeChange} />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          label="Deliveries"
          value={stats.total.toLocaleString()}
          description={`${successful.toLocaleString()} successful`}
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

      <div className="grid min-h-[340px] gap-4 xl:grid-cols-2">
        <Card variant="layer" className="min-w-0">
          <CardHeader>
            <CardTitle>Event deliveries</CardTitle>
            <CardDescription>
              Total and failed attempts over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasBuckets ? (
              <ChartContainer
                config={deliveryChartConfig}
                className="h-[260px] w-full"
              >
                <LineChart data={stats.buckets}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatBucketLabel}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={32}
                  />
                  <YAxis tickLine={false} axisLine={false} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="var(--color-total)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="failed"
                    stroke="var(--color-failed)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <EmptyChartState label="No delivery data for this range" />
            )}
          </CardContent>
        </Card>

        <Card variant="layer" className="min-w-0">
          <CardHeader>
            <CardTitle>Response time</CardTitle>
            <CardDescription>Average latency in milliseconds</CardDescription>
          </CardHeader>
          <CardContent>
            {hasBuckets ? (
              <ChartContainer
                config={latencyChartConfig}
                className="h-[260px] w-full"
              >
                <LineChart data={stats.buckets}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatBucketLabel}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={32}
                  />
                  <YAxis tickLine={false} axisLine={false} width={44} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="avgDurationMs"
                    stroke="var(--color-avgDurationMs)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <EmptyChartState label="No latency data for this range" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
