'use client'

import { useId, useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDownIcon, CpuIcon } from '@/ui/primitives/icons'
import { Tabs, TabsList, TabsTrigger } from '@/ui/primitives/tabs'
import { useUsageCharts } from '../usage-charts-context'
import { UsageTopTimeRangeControls } from '../usage-top-time-range-controls'
import { USAGE_METRICS, type UsageMetricKey } from './metrics'
import { SingleMetricChart } from './single-metric-chart'
import { UsageAreaChart } from './usage-area-chart'

type Resource = 'vcpu' | 'ram'

interface ResourceMeta {
  label: string
  swatch: { fill: string; border: string }
  unitLabel: string
  hoursLabel: string
}

const RESOURCE_META: Record<Resource, ResourceMeta> = {
  vcpu: {
    label: 'vCPU',
    swatch: { fill: '#9e9185', border: 'var(--graph-1)' },
    unitLabel: 'vCPU / hour',
    hoursLabel: 'vCPU hours',
  },
  ram: {
    label: 'RAM',
    swatch: { fill: '#8e4f15', border: 'var(--graph-3)' },
    unitLabel: 'RAM GiB / hour',
    hoursLabel: 'RAM hours',
  },
}

export function UsageMetricDetail({ metric }: { metric: UsageMetricKey }) {
  return (
    <div className="h-full max-h-full min-h-0 overflow-y-auto">
      <div className="flex w-full flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-1">
          <UsageTopTimeRangeControls />
        </div>

        <SingleMetricChart
          metric={metric}
          className="flex-none border-b-0"
          plotClassName="h-72"
        />

        <div className="flex flex-col">
          <Tabs defaultValue="resources">
            <TabsList className="w-full justify-start px-0">
              <TabsTrigger layoutkey="usage-detail-group" value="resources">
                <CpuIcon />
                By resources
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <ResourceBreakdown />
        </div>
      </div>
    </div>
  )
}

function ResourceBreakdown() {
  const { costBreakdown, totals } = useUsageCharts()
  const cost = costBreakdown.reduce(
    (acc, point) => {
      acc.vcpu += point.cpu
      acc.ram += point.ram
      return acc
    },
    { vcpu: 0, ram: 0 }
  )

  return (
    <div className="flex flex-col">
      <ResourceRow resource="vcpu" cost={cost.vcpu} hours={totals.vcpu} />
      <ResourceRow resource="ram" cost={cost.ram} hours={totals.ram} />
    </div>
  )
}

function ResourceRow({
  resource,
  cost,
  hours,
}: {
  resource: Resource
  cost: number
  hours: number
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = RESOURCE_META[resource]
  const panelId = useId()

  return (
    <div className="border-stroke border-b">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center justify-between py-3"
      >
        <span className="prose-body text-fg">{meta.label}</span>
        <span className="flex items-center gap-2">
          <span className="prose-body-numeric text-fg font-mono">
            {USAGE_METRICS.cost.format(cost)}
          </span>
          <ChevronDownIcon
            className={cn(
              'text-icon-tertiary size-4 transition-transform',
              expanded && 'rotate-180'
            )}
          />
        </span>
      </button>
      {expanded && (
        <div
          id={panelId}
          className="flex flex-col gap-6 pb-4 md:flex-row md:items-start"
        >
          <div className="min-w-0 flex-1">
            <ResourceChart resource={resource} />
          </div>
          <ResourceSummary resource={resource} cost={cost} hours={hours} />
        </div>
      )}
    </div>
  )
}

function ResourceSummary({
  resource,
  cost,
  hours,
}: {
  resource: Resource
  cost: number
  hours: number
}) {
  const meta = RESOURCE_META[resource]
  const currency = USAGE_METRICS.cost.format
  const hoursFormat = USAGE_METRICS.vcpu.format

  return (
    <div className="flex w-full flex-col gap-1.5 md:max-w-[280px]">
      <SummaryRow
        label={meta.unitLabel}
        value={currency(hours > 0 ? cost / hours : 0)}
      />
      <SummaryRow label={meta.hoursLabel} value={hoursFormat(hours)} />
      <SummaryRow
        label={`${meta.label} total`}
        value={currency(cost)}
        emphasized
      />
    </div>
  )
}

function SummaryRow({
  label,
  value,
  emphasized,
}: {
  label: string
  value: string
  emphasized?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={cn(
          'prose-label uppercase',
          emphasized ? 'text-fg font-medium' : 'text-fg-tertiary'
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'prose-body-numeric font-mono',
          emphasized ? 'text-fg font-medium' : 'text-fg-secondary'
        )}
      >
        {value}
      </span>
    </div>
  )
}

function ResourceChart({ resource }: { resource: Resource }) {
  const { displayedData, costBreakdown, bucketLabels } = useUsageCharts()
  const meta = RESOURCE_META[resource]
  const currency = USAGE_METRICS.cost.format
  const hoursFormat = USAGE_METRICS.vcpu.format

  const hoursSeries =
    resource === 'ram' ? displayedData.ram : displayedData.vcpu
  const series = costBreakdown.map((point, index) => ({
    x: displayedData.cost[index]?.x ?? '',
    y: resource === 'ram' ? point.ram : point.cpu,
  }))

  return (
    <UsageAreaChart
      series={series}
      color={meta.swatch.border}
      axisFormat={USAGE_METRICS.cost.axisFormat}
      plotClassName="h-56"
      labelFor={(index) => bucketLabels[index] ?? series[index]?.x ?? ''}
      segments={() => [{ fraction: 1, ...meta.swatch }]}
      card={(index) => {
        const cost = series[index]?.y ?? 0
        const hours = hoursSeries[index]?.y ?? 0
        return {
          totalLabel: `Total · ${bucketLabels[index] ?? ''}`,
          totalValue: currency(cost),
          sections: [
            {
              swatch: meta.swatch,
              totalLabel: `${meta.label} total`,
              totalValue: currency(cost),
              rows: [
                {
                  label: meta.unitLabel,
                  value: currency(hours > 0 ? cost / hours : 0),
                },
                { label: meta.hoursLabel, value: hoursFormat(hours) },
              ],
            },
          ],
        }
      }}
    />
  )
}
