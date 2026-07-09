'use client'

import { useTimezone } from '@/features/dashboard/timezone'
import { cn } from '@/lib/utils'
import { formatDateRange } from '@/lib/utils/formatting'
import { useUsageCharts } from '../usage-charts-context'
import { USAGE_METRICS, type UsageMetricKey } from './metrics'
import { type HoverSection, UsageAreaChart } from './usage-area-chart'

// Swatch colors shared with the hover card and stacked column.
const VCPU_SWATCH = { fill: '#9e9185', border: 'var(--graph-1)' }
const RAM_SWATCH = { fill: '#8e4f15', border: 'var(--graph-3)' }

/** vCPU + RAM breakdown for a day's cost: unit price, hours, and resource total. */
function buildCostSections(
  breakdown: { cpu: number; ram: number },
  vcpuHours: number,
  ramHours: number
): HoverSection[] {
  const currency = USAGE_METRICS.cost.format
  const hours = USAGE_METRICS.vcpu.format
  return [
    {
      swatch: VCPU_SWATCH,
      totalLabel: 'vCPU total',
      totalValue: currency(breakdown.cpu),
      rows: [
        {
          label: 'vCPU / hour',
          value: currency(vcpuHours > 0 ? breakdown.cpu / vcpuHours : 0),
        },
        { label: 'vCPU hours', value: hours(vcpuHours) },
      ],
    },
    {
      swatch: RAM_SWATCH,
      totalLabel: 'RAM total',
      totalValue: currency(breakdown.ram),
      rows: [
        {
          label: 'RAM GiB / hour',
          value: currency(ramHours > 0 ? breakdown.ram / ramHours : 0),
        },
        { label: 'RAM hours', value: hours(ramHours) },
      ],
    },
  ]
}

interface SingleMetricChartProps {
  metric: UsageMetricKey
  className?: string
  plotClassName?: string
}

export function SingleMetricChart({
  metric,
  className,
  plotClassName,
}: SingleMetricChartProps) {
  const { displayedData, totals, timeframe, costBreakdown, bucketLabels } =
    useUsageCharts()
  const { timezone } = useTimezone()
  const meta = USAGE_METRICS[metric]
  const series = displayedData[metric]

  return (
    <div
      className={cn(
        'border-stroke flex min-h-0 flex-1 flex-col gap-1 border-b py-2 last:border-b-0',
        className
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="prose-value-big text-fg font-mono uppercase">
            {meta.format(totals[metric])}
          </span>
          <span className="prose-label text-fg-tertiary uppercase">
            total {meta.label} for{' '}
            {formatDateRange(timeframe.start, timeframe.end, { timezone })}
          </span>
        </div>
      </div>
      <UsageAreaChart
        series={series}
        color={meta.color}
        axisFormat={meta.axisFormat}
        plotClassName={plotClassName}
        labelFor={(index) => bucketLabels[index] ?? series[index]?.x ?? ''}
        segments={(index) => {
          const breakdown = costBreakdown[index]
          const total = series[index]?.y ?? 0
          if (metric === 'cost' && breakdown && total > 0) {
            return [
              { fraction: breakdown.cpu / total, ...VCPU_SWATCH },
              { fraction: breakdown.ram / total, ...RAM_SWATCH },
            ]
          }
          return [{ fraction: 1, fill: meta.color, border: meta.color }]
        }}
        card={(index) => {
          const breakdown = costBreakdown[index]
          return {
            totalLabel: `Total · ${bucketLabels[index] ?? ''}`,
            totalValue: meta.format(series[index]?.y ?? 0),
            sections:
              metric === 'cost' && breakdown
                ? buildCostSections(
                    breakdown,
                    displayedData.vcpu[index]?.y ?? 0,
                    displayedData.ram[index]?.y ?? 0
                  )
                : [],
          }
        }}
      />
    </div>
  )
}
