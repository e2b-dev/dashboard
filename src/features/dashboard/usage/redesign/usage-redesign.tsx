'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import {
  ChevronDownIcon,
  FilterIcon,
  HistoryIcon,
  KeyIcon,
  SearchIcon,
  TemplateIcon,
  UnpackIcon,
} from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import { UsageRedesignChart } from './usage-redesign-chart'

type GroupBy = 'template' | 'api-key'

// Static placeholder rows — the redesigned usage page is not yet wired to data.
const MOCK_ROWS: { name: string; madeByE2B: boolean; cost: string }[] = [
  { name: 'base', madeByE2B: true, cost: '$7,124.24' },
  { name: 'code-interpreter-v1', madeByE2B: true, cost: '$4,124.24' },
  { name: 'desktop', madeByE2B: true, cost: '$1,124.50' },
  { name: 'runtime-eval-v4', madeByE2B: false, cost: '$452.00' },
  { name: 'runtime-eval-v3', madeByE2B: false, cost: '$312.00' },
  { name: 'runtime-eval-v2', madeByE2B: false, cost: '$99.23' },
  { name: 'runtime-eval-v1', madeByE2B: false, cost: '$0.00' },
]

export function UsageRedesignPage() {
  const [groupBy, setGroupBy] = useState<GroupBy>('template')

  return (
    <div className="h-full max-h-full min-h-0 overflow-y-auto">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 p-3 md:p-8">
        <UsageControls />

        <div className="flex flex-col gap-4">
          <TotalCost />
          <UsageRedesignChart />
        </div>

        <div className="flex flex-col">
          <TabSwitcher value={groupBy} onChange={setGroupBy} />
          <CostList />
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
          className="pl-8.5"
          aria-label="Search by name"
        />
      </div>

      <Button variant="secondary" type="button">
        <HistoryIcon />
        This month (April)
        <UnpackIcon />
      </Button>

      <Button variant="secondary" type="button">
        <FilterIcon />
        Filter
      </Button>
    </div>
  )
}

function TotalCost() {
  return (
    <div className="flex flex-wrap items-baseline gap-3">
      <span className="prose-value-big text-fg font-mono uppercase">
        $15,124.24
      </span>
      <span className="prose-label text-fg-tertiary uppercase">
        total cost for 1 Apr – 19 Apr
      </span>
    </div>
  )
}

function TabSwitcher({
  value,
  onChange,
}: {
  value: GroupBy
  onChange: (value: GroupBy) => void
}) {
  return (
    <div className="border-stroke flex gap-6 border-b">
      <Tab
        active={value === 'template'}
        onClick={() => onChange('template')}
        icon={<TemplateIcon />}
        label="By template"
      />
      <Tab
        active={value === 'api-key'}
        onClick={() => onChange('api-key')}
        icon={<KeyIcon />}
        label="By API key"
      />
    </div>
  )
}

function Tab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'prose-body-highlight flex cursor-pointer items-center gap-1.5 border-b py-2.5 -mb-px',
        '[&_svg]:size-4',
        active
          ? 'border-accent-main-highlight text-fg [&_svg]:text-fg'
          : 'border-transparent text-fg-tertiary [&_svg]:text-icon-tertiary'
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function CostList() {
  return (
    <div className="flex flex-col">
      {MOCK_ROWS.map((row) => (
        <div
          key={row.name}
          className="border-stroke flex items-center justify-between border-b py-3"
        >
          <div className="flex items-center gap-1.5">
            <span className="prose-body text-fg">{row.name}</span>
            {row.madeByE2B && (
              <Badge variant="default" size="sm">
                by E2B
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="prose-body-numeric text-fg font-mono">
              {row.cost}
            </span>
            <ChevronDownIcon className="text-icon-tertiary size-4" />
          </div>
        </div>
      ))}
    </div>
  )
}
