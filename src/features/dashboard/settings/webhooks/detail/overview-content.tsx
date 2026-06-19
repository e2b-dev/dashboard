'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { useQueryStates } from 'nuqs'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useTRPC } from '@/trpc/client'
import {
  getDeliveryCountSeriesData,
  getResponseTimeSeriesData,
} from './chart-utils'
import { StatsChart, type StatsChartSeries } from './stats-chart'
import { StatsIntervalSelect } from './stats-interval-select'
import {
  getValidWebhookStatsBounds,
  getWebhookStatsApiBounds,
  getWebhookStatsBucketIntervalSeconds,
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
  legendItems: ChartLegendItem[]
  title: string
}

type ChartLegendItem = {
  label: string
  indicatorClassName: string
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

const ChartLegend = ({ items }: { items: ChartLegendItem[] }) => (
  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-fg-tertiary">
    {items.map((item) => (
      <div key={item.label} className="flex items-center gap-1.5">
        <span
          className={`h-px w-5 shrink-0 rounded-full ${item.indicatorClassName}`}
        />
        <span className="text-fg uppercase prose-label">{item.label}</span>
      </div>
    ))}
  </div>
)

const ChartPanel = ({ children, legendItems, title }: ChartPanelProps) => (
  <section className="flex min-w-0 flex-col p-3 md:p-6">
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="text-fg uppercase prose-label-highlight max-md:text-sm">
        <span>{title}</span>
      </div>
      <ChartLegend items={legendItems} />
    </div>
    <div className="mt-3 min-h-0 flex-1 md:mt-4">{children}</div>
  </section>
)

const deliveryLegendItems = [
  {
    label: 'Total',
    indicatorClassName: 'bg-accent-info-highlight',
  },
  {
    label: 'Failed',
    indicatorClassName: 'bg-accent-error-highlight',
  },
] satisfies ChartLegendItem[]

const latencyLegendItems = [
  {
    label: 'Min',
    indicatorClassName: 'bg-accent-positive-highlight',
  },
  {
    label: 'Avg',
    indicatorClassName: 'bg-bg-inverted',
  },
  {
    label: 'Max',
    indicatorClassName: 'bg-accent-main-highlight',
  },
] satisfies ChartLegendItem[]

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
  const bucketIntervalSeconds =
    getWebhookStatsBucketIntervalSeconds(rangeBounds)
  const rangeStartMs = rangeBounds.start
  const rangeEndMs = rangeBounds.end
  const hasFailedDeliveries = buckets.some((bucket) => bucket.failed > 0)
  const totalDeliveryData = getDeliveryCountSeriesData(
    buckets,
    rangeBounds,
    bucketIntervalSeconds
  )
  const failedDeliveryData = getDeliveryCountSeriesData(
    buckets,
    rangeBounds,
    bucketIntervalSeconds,
    'failed'
  )
  const successfulDeliveryBandData = totalDeliveryData.map((point, index) => {
    const failedValue = failedDeliveryData[index]?.value ?? 0
    const totalValue = point.value ?? 0

    return {
      ...point,
      value: Math.max(totalValue - failedValue, 0),
    }
  })
  const deliverySeries = [
    {
      name: 'Failed deliveries fill',
      colorVar: '--accent-error-highlight',
      alignAreaGradientToYAxis: true,
      areaFromOpacity: 0.14,
      areaGradientData: failedDeliveryData,
      areaToOpacity: 0.04,
      showArea: true,
      lineOpacity: 0,
      showSymbol: false,
      showTooltipMarker: false,
      stack: 'delivery-area',
      z: 1,
      data: failedDeliveryData,
    },
    {
      name: 'Successful deliveries fill',
      colorVar: '--accent-info-highlight',
      alignAreaGradientToYAxis: true,
      areaFromOpacity: 0.12,
      areaGradientData: totalDeliveryData,
      areaToOpacity: 0.03,
      showArea: true,
      lineOpacity: 0,
      showSymbol: false,
      showTooltipMarker: false,
      stack: 'delivery-area',
      z: 1,
      data: successfulDeliveryBandData,
    },
    {
      name: 'Total deliveries',
      colorVar: '--accent-info-highlight',
      showSymbol: false,
      z: 2,
      data: totalDeliveryData,
    },
    {
      name: 'Failed deliveries',
      colorVar: '--accent-error-highlight',
      showSymbol: false,
      z: hasFailedDeliveries ? 3 : 1,
      data: failedDeliveryData,
    },
    {
      name: 'Total zero baseline',
      colorVar: '--accent-info-highlight',
      showSymbol: false,
      showTooltipMarker: false,
      z: 4,
      data: totalDeliveryData.map((point) => ({
        ...point,
        value: point.value === 0 ? 0 : null,
      })),
    },
  ] satisfies StatsChartSeries[]
  const minLatencyData = getResponseTimeSeriesData(
    buckets,
    rangeBounds,
    bucketIntervalSeconds,
    'min'
  )
  const avgLatencyData = getResponseTimeSeriesData(
    buckets,
    rangeBounds,
    bucketIntervalSeconds,
    'avg'
  )
  const maxLatencyData = getResponseTimeSeriesData(
    buckets,
    rangeBounds,
    bucketIntervalSeconds,
    'max'
  )
  const getLatencyBandData = (
    lowerData: typeof minLatencyData | null,
    upperData: typeof minLatencyData
  ) =>
    upperData.map((point, index) => {
      const lowerValue = lowerData?.[index]?.value ?? 0
      const upperValue = point.value ?? 0

      return {
        ...point,
        value: Math.max(upperValue - lowerValue, 0),
      }
    })
  const latencySeries = [
    {
      name: 'Min fill',
      colorVar: '--accent-positive-highlight',
      alignAreaGradientToYAxis: true,
      areaGradientData: minLatencyData,
      showArea: true,
      areaFromOpacity: 0.08,
      areaToOpacity: 0.018,
      connectNulls: false,
      lineOpacity: 0,
      showTooltipMarker: false,
      showSymbol: false,
      stack: 'latency-area',
      z: 1,
      data: getLatencyBandData(null, minLatencyData),
    },
    {
      name: 'Avg fill',
      colorVar: '--bg-inverted',
      alignAreaGradientToYAxis: true,
      areaGradientData: avgLatencyData,
      showArea: true,
      areaFromOpacity: 0.08,
      areaToOpacity: 0.018,
      connectNulls: false,
      lineOpacity: 0,
      showTooltipMarker: false,
      showSymbol: false,
      stack: 'latency-area',
      z: 1,
      data: getLatencyBandData(minLatencyData, avgLatencyData),
    },
    {
      name: 'Max fill',
      colorVar: '--accent-main-highlight',
      alignAreaGradientToYAxis: true,
      areaGradientData: maxLatencyData,
      showArea: true,
      areaFromOpacity: 0.1,
      areaToOpacity: 0.02,
      connectNulls: false,
      lineOpacity: 0,
      showTooltipMarker: false,
      showSymbol: false,
      stack: 'latency-area',
      z: 1,
      data: getLatencyBandData(avgLatencyData, maxLatencyData),
    },
    {
      name: 'Min',
      colorVar: '--accent-positive-highlight',
      connectNulls: false,
      showSymbol: false,
      z: 2,
      data: minLatencyData,
    },
    {
      name: 'Avg',
      colorVar: '--bg-inverted',
      connectNulls: false,
      showSymbol: false,
      z: 4,
      data: avgLatencyData,
    },
    {
      name: 'Max',
      colorVar: '--accent-main-highlight',
      connectNulls: false,
      showSymbol: false,
      z: 2,
      data: maxLatencyData,
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
        <ChartPanel title="Event deliveries" legendItems={deliveryLegendItems}>
          <StatsChart
            series={deliverySeries}
            bucketIntervalSeconds={bucketIntervalSeconds}
            chartType="line"
            xAxisRange={range}
            xAxisMin={rangeStartMs}
            xAxisMax={rangeEndMs}
          />
        </ChartPanel>

        <ChartPanel title="Response time" legendItems={latencyLegendItems}>
          <StatsChart
            series={latencySeries}
            bucketIntervalSeconds={bucketIntervalSeconds}
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
