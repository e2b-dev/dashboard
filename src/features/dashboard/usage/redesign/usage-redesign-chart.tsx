'use client'

import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  type TooltipProps,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'
import { formatAxisNumber, formatCurrency } from '@/lib/utils/formatting'
import { cardVariants } from '@/ui/primitives/card'
import { ChartContainer, ChartTooltip } from '@/ui/primitives/chart'
import { useUsageCharts } from '../usage-charts-context'

// The billing API only exposes team-level cost, so there is a single "Default"
// group. Keeping the chart driven by this list means adding real per-template /
// per-API-key grouping later is just a matter of extending it plus the point mapping.
const GROUPS = [
  { key: 'default', name: 'Default', color: 'var(--accent-main-highlight)' },
] as const

type GroupKey = (typeof GROUPS)[number]['key']

type UsageChartPoint = { label: string; total: number } & Record<
  GroupKey,
  number
>

export function UsageRedesignChart() {
  const { displayedData } = useUsageCharts()

  const data = useMemo<UsageChartPoint[]>(
    () =>
      displayedData.cost.map((point) => ({
        label: point.x,
        // Single group today; total is the sum across all groups.
        default: point.y,
        total: point.y,
      })),
    [displayedData.cost]
  )

  return (
    <ChartContainer config={{}} className="aspect-auto h-45 w-full">
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          {GROUPS.map((group) => (
            <linearGradient
              key={group.key}
              id={`usage-fill-${group.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={group.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={group.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          stroke="var(--stroke)"
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={40}
          interval="preserveStartEnd"
        />
        <YAxis
          width={40}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${formatAxisNumber(value)}`}
        />
        <ChartTooltip
          cursor={{ stroke: 'var(--stroke)', strokeDasharray: '3 3' }}
          content={<UsageTooltip />}
        />
        {GROUPS.map((group) => (
          <Area
            key={group.key}
            type="step"
            dataKey={group.key}
            stackId="usage"
            stroke={group.color}
            strokeWidth={1.5}
            fill={`url(#usage-fill-${group.key})`}
            fillOpacity={1}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  )
}

function UsageTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) {
    return null
  }

  const point = payload[0]?.payload as UsageChartPoint | undefined

  if (!point) {
    return null
  }

  return (
    <div
      className={cn(
        cardVariants({ variant: 'layer' }),
        'flex min-w-[180px] flex-col gap-2 px-3 py-2 shadow-xl'
      )}
    >
      <div className="flex flex-col gap-1">
        {GROUPS.map((group) => (
          <div
            key={group.key}
            className="flex items-center justify-between gap-6"
          >
            <span className="prose-body text-fg">{group.name}</span>
            <span className="prose-body-numeric text-fg font-mono">
              {formatCurrency(point[group.key])}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-6">
        <span className="prose-label text-fg-tertiary uppercase">
          total · {point.label}
        </span>
        <span className="prose-body-numeric text-fg font-mono">
          {formatCurrency(point.total)}
        </span>
      </div>
    </div>
  )
}
