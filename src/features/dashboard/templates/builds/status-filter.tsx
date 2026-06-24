'use client'

import type { BuildStatus } from '@/core/modules/builds/models'
import { cn } from '@/lib/utils'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { StatusIcon } from '@/ui/primitives/icons'
import { Status } from './table-cells'

const STATUS_OPTIONS: Array<{ value: BuildStatus; label: string }> = [
  { value: 'building', label: 'Building' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
]

const STATUS_DISPLAY_ORDER: BuildStatus[] = ['building', 'failed', 'success']

interface BuildsStatusFilterProps {
  statuses: BuildStatus[]
  onStatusesChange: (statuses: BuildStatus[]) => void
}

export function BuildsStatusFilter({
  statuses,
  onStatusesChange,
}: BuildsStatusFilterProps) {
  const toggleStatus = (status: BuildStatus) => {
    const isSelected = statuses.includes(status)

    // Don't allow deselecting the last status — the table query needs at least one.
    if (isSelected && statuses.length === 1) return

    const next = isSelected
      ? statuses.filter((s) => s !== status)
      : [...statuses, status]

    onStatusesChange(next)
  }

  const selectAll = () => {
    onStatusesChange(STATUS_OPTIONS.map((s) => s.value))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="w-min pr-3 pl-2.5">
          <StatusIcons selectedStatuses={statuses} /> Status • {statuses.length}
          /{STATUS_OPTIONS.length}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuCheckboxItem
          checked={statuses.length === STATUS_OPTIONS.length}
          onCheckedChange={selectAll}
          onSelect={(e) => e.preventDefault()}
        >
          All
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {STATUS_OPTIONS.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={statuses.includes(option.value)}
            onCheckedChange={() => toggleStatus(option.value)}
            onSelect={(e) => e.preventDefault()}
          >
            <Status status={option.value} />
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface StatusIconsProps {
  selectedStatuses: BuildStatus[]
}

function StatusIcons({ selectedStatuses }: StatusIconsProps) {
  const sortedStatuses = STATUS_DISPLAY_ORDER.filter((s) =>
    selectedStatuses.includes(s)
  )

  return (
    <div className="flex -space-x-2">
      {sortedStatuses.map((status, i) => (
        <DashedStatusCircleIcon key={status} status={status} index={i} />
      ))}
    </div>
  )
}

interface DashedStatusCircleIconProps {
  status: BuildStatus
  index: number
}

// StatusIcon (an SVG ring) instead of a CSS dashed border: Safari renders
// `border-dashed` on rounded elements with uneven, sparse dashes. The opaque
// backdrop masks the ring behind it in the overlap, as the old `bg-bg` did.
function DashedStatusCircleIcon({
  status,
  index,
}: DashedStatusCircleIconProps) {
  return (
    <span
      className="relative grid shrink-0 place-items-center"
      style={{ rotate: `${index * 50}deg`, zIndex: index + 1 }}
    >
      <span className="col-start-1 row-start-1 size-3.5 rounded-full bg-bg" />
      <StatusIcon
        size={17}
        className={cn('col-start-1 row-start-1', {
          'text-fg-tertiary': status === 'building',
          'text-accent-positive-highlight': status === 'success',
          'text-accent-error-highlight': status === 'failed',
        })}
      />
    </span>
  )
}
