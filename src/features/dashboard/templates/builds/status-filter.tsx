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

/**
 * Pure presentational status filter for the builds list. Takes a value
 * and a change callback; owns no state, calls no hooks beyond primitive
 * UI ones. Mirrors the pattern used by `EventTypeFilter` in
 * `features/dashboard/sandbox/events/`.
 */
export function BuildsStatusFilter({
  statuses,
  onStatusesChange,
}: BuildsStatusFilterProps) {
  const toggleStatus = (status: BuildStatus) => {
    const isSelected = statuses.includes(status)

    // Don't allow deselecting the last status \u2014 the table query needs
    // at least one to filter on.
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
    <div className="flex -space-x-1.5">
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

function DashedStatusCircleIcon({
  status,
  index,
}: DashedStatusCircleIconProps) {
  return (
    <div
      className={cn(
        'size-3.5 rounded-full bg-bg border-[1.5px] border-dashed',
        {
          'border-fg-tertiary': status === 'building',
          'border-accent-positive-highlight': status === 'success',
          'border-accent-error-highlight': status === 'failed',
        }
      )}
      style={{ rotate: `${index * 50}deg`, zIndex: index + 1 }}
    />
  )
}
