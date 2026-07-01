'use client'

import { formatCurrency, formatDateRange } from '@/lib/utils/formatting'
import { Button } from '@/ui/primitives/button'
import { FilterIcon, SearchIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import { useUsageCharts } from '../usage-charts-context'
import { UsageTopTimeRangeControls } from '../usage-top-time-range-controls'
import { UsageRedesignChart } from './usage-redesign-chart'

export function UsageRedesignPage() {
  return (
    <div className="h-full max-h-full min-h-0 overflow-y-auto">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 p-3 md:p-8">
        <UsageControls />

        <div className="flex flex-col gap-4">
          <TotalCost />
          <UsageRedesignChart />
        </div>
      </div>
    </div>
  )
}

function UsageControls() {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <div className="relative w-full max-w-[280px]">
        <SearchIcon className="text-icon-tertiary pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search by name"
          readOnly
          disabled
          className="pl-8.5"
          aria-label="Search by name"
        />
      </div>

      <UsageTopTimeRangeControls />

      <Button variant="secondary" type="button" disabled>
        <FilterIcon />
        Filter
      </Button>
    </div>
  )
}

function TotalCost() {
  const { totals, timeframe } = useUsageCharts()

  return (
    <div className="flex flex-wrap items-baseline gap-3">
      <span className="prose-value-big text-fg font-mono uppercase">
        {formatCurrency(totals.cost)}
      </span>
      <span className="prose-label text-fg-tertiary uppercase">
        total cost for {formatDateRange(timeframe.start, timeframe.end)}
      </span>
    </div>
  )
}
