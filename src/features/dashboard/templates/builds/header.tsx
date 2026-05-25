'use client'

import { useEffect, useState } from 'react'
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
import { Input } from '@/ui/primitives/input'
import { Status } from './table-cells'
import useFilters from './use-filters'
import useTemplateBuildsFilters from './use-template-builds-filters'
import { SearchIcon } from '@/ui/primitives/icons'

interface DashedStatusCircleIconProps {
  status: BuildStatus
  index: number
}

const DashedStatusCircleIcon = ({
  status,
  index,
}: DashedStatusCircleIconProps) => {
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

const StatusIcons = ({
  selectedStatuses,
}: {
  selectedStatuses: BuildStatus[]
}) => {
  const statusOrder: BuildStatus[] = ['building', 'failed', 'success']
  const sortedStatuses = statusOrder.filter((s) => selectedStatuses.includes(s))

  return (
    <div className="flex -space-x-1.5">
      {sortedStatuses.map((status, i) => (
        <DashedStatusCircleIcon key={status} status={status} index={i} />
      ))}
    </div>
  )
}

const STATUS_OPTIONS: Array<{ value: BuildStatus; label: string }> = [
  { value: 'building', label: 'Building' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
]

interface BuildsHeaderProps {
  /**
   * When false, hides the search input entirely. Default true.
   */
  showSearchInput?: boolean
  /**
   * When true, the header uses the template-scoped filters hook
   * (statuses + `q` URL state) instead of the shared `useFilters` hook.
   * Pair this with `BuildsTable templateId={...}` so both surfaces read
   * from the same URL state and the search applies client-side to the
   * templateID-scoped backend results.
   */
  scoped?: boolean
}

export default function BuildsHeader({
  showSearchInput = true,
  scoped = false,
}: BuildsHeaderProps = {}) {
  // Both hooks must be called unconditionally to satisfy React's rules.
  // `scoped` only changes via route navigation — the component is
  // unmounted between transitions, so hook order remains consistent.
  const sharedFilters = useFilters()
  const scopedFilters = useTemplateBuildsFilters()

  const statuses = scoped ? scopedFilters.statuses : sharedFilters.statuses
  const setStatuses = scoped
    ? scopedFilters.setStatuses
    : sharedFilters.setStatuses

  // Unified search state: in scoped mode it maps to `q` (URL),
  // in all-team mode it maps to `buildIdOrTemplate` (URL).
  const search = scoped ? scopedFilters.q : sharedFilters.buildIdOrTemplate
  const setSearch = scoped
    ? scopedFilters.setQ
    : sharedFilters.setBuildIdOrTemplate
  const searchPlaceholder = scoped
    ? 'Search by build ID'
    : 'Build ID, Template ID or Name'

  const [localSearch, setLocalSearch] = useState<string>(search ?? '')

  const [localStatuses, setLocalStatuses] = useState<BuildStatus[]>(statuses)

  useEffect(() => {
    setLocalSearch(search ?? '')
  }, [search])

  useEffect(() => {
    setLocalStatuses(statuses)
  }, [statuses])

  const toggleStatus = (status: BuildStatus) => {
    const isSelected = localStatuses.includes(status)

    if (isSelected && localStatuses.length === 1) {
      return
    }

    const newStatuses = isSelected
      ? localStatuses.filter((s) => s !== status)
      : [...localStatuses, status]

    setLocalStatuses(newStatuses)
    setStatuses(newStatuses)
  }

  const selectAllStatuses = () => {
    const allStatuses = STATUS_OPTIONS.map((s) => s.value)
    setLocalStatuses(allStatuses)
    setStatuses(allStatuses)
  }

  return (
    <div className="flex sm:flex-row flex-col gap-1">
      {showSearchInput && (
        <div className="relative w-full max-w-70">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-fg-tertiary pointer-events-none" />
          <Input
            placeholder={searchPlaceholder}
            className="pl-[30px]"
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value)
                setSearch(e.target.value)
              }}
          />
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" className="w-min pr-3 pl-2.5">
            <StatusIcons selectedStatuses={localStatuses} /> Status •{' '}
            {localStatuses.length}/{STATUS_OPTIONS.length}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuCheckboxItem
            checked={localStatuses.length === STATUS_OPTIONS.length}
            onCheckedChange={selectAllStatuses}
            onSelect={(e) => e.preventDefault()}
          >
            All
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {STATUS_OPTIONS.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={localStatuses.includes(option.value)}
              onCheckedChange={() => toggleStatus(option.value)}
              onSelect={(e) => e.preventDefault()}
            >
              <Status status={option.value} />
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
