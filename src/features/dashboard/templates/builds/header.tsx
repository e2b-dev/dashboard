'use client'

import { cn } from '@/lib/utils'
import type { BuildStatus } from '@/server/api/models/builds.models'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { Input } from '@/ui/primitives/input'
import { useState } from 'react'
import { Status } from './table-cells'

interface DashedStatusCircleIconProps {
  status: BuildStatus
  className?: string
}

const DashedStatusCircleIcon = ({
  status,
  className,
}: DashedStatusCircleIconProps) => {
  return (
    <div
      className={cn(
        'size-3.5 rounded-full bg-bg border-[1.5px] border-dashed',
        {
          'border-fg-tertiary': status === 'building',
          'border-accent-positive-highlight': status === 'success',
          'border-accent-error-highlight': status === 'failed',
        },
        className
      )}
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
        <DashedStatusCircleIcon
          key={status}
          status={status}
          className={`z-[${1 + i}]! rotate-[${i * 10}deg`}
        />
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
  const [selectedStatuses, setSelectedStatuses] = useState<BuildStatus[]>([
    'building',
    'success',
    'failed',
  ])

  const toggleStatus = (status: BuildStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Input placeholder="Build ID, Template ID or Name" className="w-62" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="font-sans w-min normal-case"
          >
            <StatusIcons selectedStatuses={selectedStatuses} /> Status •{' '}
            {selectedStatuses.length}/{STATUS_OPTIONS.length}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuCheckboxItem
            checked={selectedStatuses.length === STATUS_OPTIONS.length}
            onCheckedChange={() =>
              setSelectedStatuses(STATUS_OPTIONS.map((s) => s.value))
            }
          >
            All
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {STATUS_OPTIONS.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selectedStatuses.includes(option.value)}
              onCheckedChange={() => toggleStatus(option.value)}
            >
              <Status status={option.value} />
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
