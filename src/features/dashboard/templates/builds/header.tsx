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
import { FilterIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/primitives/popover'
import {
  ResourcesFilter,
  type ResourcesFilterValue,
} from '../../common/resources-filter'
import { Status } from './table-cells'
import useFilters from './use-filters'

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

export default function BuildsHeader() {
  const {
    statuses,
    setStatuses,
    buildIdOrTemplate,
    setBuildIdOrTemplate,
    cpuCount,
    memoryMB,
    setResources,
  } = useFilters()

  const [localBuildIdOrTemplate, setLocalBuildIdOrTemplate] = useState<string>(
    buildIdOrTemplate ?? ''
  )

  const [localStatuses, setLocalStatuses] = useState<BuildStatus[]>(statuses)
  const [localResources, setLocalResources] = useState<ResourcesFilterValue>({
    cpuCount,
    memoryMB,
  })

  useEffect(() => {
    setLocalBuildIdOrTemplate(buildIdOrTemplate ?? '')
  }, [buildIdOrTemplate])

  useEffect(() => {
    setLocalStatuses(statuses)
  }, [statuses])

  useEffect(() => {
    setLocalResources({ cpuCount, memoryMB })
  }, [cpuCount, memoryMB])

  const handleResourcesChange = (next: {
    cpuCount?: number
    memoryMB?: number
  }) => {
    setLocalResources(next)
    setResources(next)
  }

  const activeResourceCount =
    (localResources.cpuCount ? 1 : 0) + (localResources.memoryMB ? 1 : 0)

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
    <div className="flex flex-row items-center gap-1">
      <Input
        placeholder="Build ID, Template ID or Name"
        className="w-full max-w-62"
        value={localBuildIdOrTemplate}
        onChange={(e) => {
          setLocalBuildIdOrTemplate(e.target.value)
          setBuildIdOrTemplate(e.target.value)
        }}
      />

      <div className="flex items-center gap-1">
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

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" className="w-min gap-2 pr-3 pl-2.5">
              <FilterIcon className="size-4 text-fg-tertiary" />
              Filter
              {activeResourceCount > 0 ? ` • ${activeResourceCount}` : ''}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <ResourcesFilter
              value={localResources}
              onChange={handleResourcesChange}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
