'use client'

import { cn } from '@/lib/utils'
import type { BuildStatusDTO } from '@/server/api/models/builds.models'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { Input } from '@/ui/primitives/input'
import { useEffect, useState } from 'react'
import { Status } from './table-cells'
import useFilters from './use-filters'

interface DashedStatusCircleIconProps {
  status: BuildStatusDTO
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
  selectedStatuses: BuildStatusDTO[]
}) => {
  const statusOrder: BuildStatusDTO[] = ['building', 'failed', 'success']
  const sortedStatuses = statusOrder.filter((s) => selectedStatuses.includes(s))

  return (
    <div className="flex -space-x-1.5">
      {sortedStatuses.map((status, i) => (
        <DashedStatusCircleIcon key={status} status={status} index={i} />
      ))}
    </div>
  )
}

const STATUS_OPTIONS: Array<{ value: BuildStatusDTO; label: string }> = [
  { value: 'building', label: 'Building' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
]

export default function BuildsHeader() {
  const { statuses, setStatuses, buildIdOrTemplate, setBuildIdOrTemplate } =
    useFilters()

  const [localBuildIdOrTemplate, setLocalBuildIdOrTemplate] = useState<string>(
    buildIdOrTemplate ?? ''
  )

  const [localStatuses, setLocalStatuses] = useState<BuildStatusDTO[]>(statuses)

  useEffect(() => {
    if (!buildIdOrTemplate) return
    setLocalBuildIdOrTemplate(buildIdOrTemplate)
  }, [buildIdOrTemplate])

  useEffect(() => {
    setLocalStatuses(statuses)
  }, [statuses])

  const toggleStatus = (status: BuildStatusDTO) => {
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
    <div className="flex flex-col gap-3">
      <Input
        placeholder="Build ID, Template ID or Name"
        className="w-full max-w-62"
        value={localBuildIdOrTemplate}
        onChange={(e) => {
          setLocalBuildIdOrTemplate(e.target.value)
          setBuildIdOrTemplate(e.target.value)
        }}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="font-sans w-min normal-case"
          >
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
