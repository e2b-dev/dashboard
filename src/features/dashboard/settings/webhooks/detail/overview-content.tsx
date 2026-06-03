'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { useQueryStates } from 'nuqs'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useTRPC } from '@/trpc/client'
import {
  getDeliveryCountSeriesData,
  getEmptyDeliveryCountSeriesData,
  getResponseTimeSeriesData,
  hideInactiveZeroValuePoints,
  type WebhookStatsGrouping,
} from './chart-utils'
import { StatsChart, type StatsChartSeries } from './stats-chart'
import { StatsIntervalSelect } from './stats-interval-select'
import {
  getValidWebhookStatsBounds,
  getWebhookStatsApiBounds,
  getWebhookStatsRange,
  getWebhookStatsRangeFromBounds,
  type WebhookStatsRange,
  type WebhookStatsRangeBounds,
  webhookStatsTimeframeParams,
} from './stats-range'

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
  <section className="flex min-w-0 flex-col p-3 md:p-6">
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-fg uppercase prose-label-highlight max-md:text-sm">
        <span>{title}</span>
      </div>
    </div>
    <div className="mt-3 min-h-0 flex-1 md:mt-4">{children}</div>
  </section>
)

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
    trpc.webhooks.getDeliveryStats.queryOptions({
      teamSlug,
      webhookId,
      ...apiRangeBounds,
    })
  )
  const stats = data.stats
  const buckets = stats.buckets
  const failureRate =
    stats.total > 0
      ? `${((stats.failed / stats.total) * 100).toFixed(1)}%`
      : '0%'
  const rangeStartMs = rangeBounds.start
  const rangeEndMs = rangeBounds.end
  const grouping: WebhookStatsGrouping =
    range === 'this-week' ? 'day' : 'timestamp'
  const hasFailedDeliveries = buckets.some((bucket) => bucket.failed > 0)
  const deliverySeries = [
    {
      name: 'Total deliveries',
      colorVar: '--accent-info-highlight',
      showSymbol: true,
      z: 2,
      data:
        buckets.length > 0
          ? getDeliveryCountSeriesData(buckets, rangeBounds, grouping)
          : getEmptyDeliveryCountSeriesData(rangeBounds, grouping),
    },
    {
      name: 'Failed deliveries',
      colorVar: '--accent-error-highlight',
      showSymbol: true,
      z: hasFailedDeliveries ? 3 : 1,
      data:
        buckets.length > 0
          ? hideInactiveZeroValuePoints(
              getDeliveryCountSeriesData(
                buckets,
                rangeBounds,
                grouping,
                'failed'
              )
            )
          : [],
    },
  ] satisfies StatsChartSeries[]
  const latencySeries = [
    {
      name: 'Min',
      colorVar: '--accent-info-highlight',
      connectNulls: true,
      lineWidth: 2,
      showSymbol: true,
      z: 1,
      data: getResponseTimeSeriesData(buckets, rangeBounds, grouping, 'min'),
    },
    {
      name: 'Avg',
      colorVar: '--accent-main-highlight',
      connectNulls: true,
      lineWidth: 2,
      showSymbol: true,
      z: 3,
      data: getResponseTimeSeriesData(buckets, rangeBounds, grouping, 'avg'),
    },
    {
      name: 'Max',
      colorVar: '--accent-warning-highlight',
      connectNulls: true,
      lineWidth: 2,
      showSymbol: true,
      z: 2,
      data: getResponseTimeSeriesData(buckets, rangeBounds, grouping, 'max'),
    },
  ] satisfies StatsChartSeries[]
  const handleRangeChange = (nextRange: WebhookStatsRange) => {
    setTimeframeParams(getWebhookStatsRange(nextRange))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex p-3 md:p-6">
        <StatsIntervalSelect value={range} onChange={handleRangeChange} />
      </div>

      <div className="grid border-y border-stroke md:grid-cols-4 md:divide-x md:divide-stroke max-md:divide-y max-md:divide-stroke">
        <MetricPanel
          label="Deliveries"
          value={stats.total.toLocaleString()}
          description={`${(stats.total - stats.failed).toLocaleString()} successful`}
        />
        <MetricPanel
          label="Failed"
          value={stats.failed.toLocaleString()}
          description={`${failureRate} failure rate`}
        />
        <MetricPanel
          label="Avg latency"
          value={`${Math.round(stats.durationMs.average).toLocaleString()}ms`}
          description="Across all attempts"
        />
        <MetricPanel
          label="Max latency"
          value={`${stats.durationMs.maximum.toLocaleString()}ms`}
          description={`Min ${stats.durationMs.minimum.toLocaleString()}ms`}
        />
      </div>

      <div className="grid min-h-[360px] md:flex-1 md:grid-cols-2 md:divide-x md:divide-stroke max-md:divide-y max-md:divide-stroke">
        <ChartPanel title="Event deliveries">
          <StatsChart
            series={deliverySeries}
            chartType="line"
            xAxisRange={range}
            xAxisMin={rangeStartMs}
            xAxisMax={rangeEndMs}
          />
        </ChartPanel>

        <ChartPanel title="Response time">
          <StatsChart
            series={latencySeries}
            xAxisMin={rangeStartMs}
            xAxisMax={rangeEndMs}
            xAxisRange={range}
            chartType="line"
            valueFormatter={(value) =>
              `${value.toLocaleString('en-US', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}ms`
            }
            yAxisValueFormatter={(value) =>
              `${Math.round(value).toLocaleString()}ms`
            }
          />
        </ChartPanel>
      </div>
    </div>
  )
}
