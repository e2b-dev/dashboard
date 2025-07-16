/* eslint-disable react-hooks/rules-of-hooks */

'use client'

import { ColumnDef, FilterFn, useReactTable } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import { Sandbox } from '@/types/api'
import { DateRange } from 'react-day-picker'
import { isWithinInterval } from 'date-fns'

import {
  CpuUsageCell,
  RamUsageCell,
  IdCell,
  TemplateCell,
  MetadataCell,
  StartedAtCell,
} from './table-cells'
import posthog from 'posthog-js'
import { logError } from '@/lib/clients/logger'
import { ClientSandboxMetric } from '@/types/sandboxes.types'

export type SandboxWithMetrics = Sandbox & {
  metrics?: ClientSandboxMetric | null
}
export type SandboxesTable = ReturnType<
  typeof useReactTable<SandboxWithMetrics>
>

export const trackTableInteraction = (
  action: string,
  properties: Record<string, unknown> = {}
) => {
  posthog.capture('sandbox table interacted', {
    action,
    ...properties,
  })
}

// FILTERS

export const fuzzyFilter: FilterFn<SandboxWithMetrics> = (
  row,
  columnId,
  value,
  addMeta
) => {
  // try catch to avoid crash by serialization issues
  try {
    if (columnId === 'metadata') {
      const metadata = row.original.metadata

      if (!metadata) return false

      const stringifiedMetadata = JSON.stringify(metadata)

      return stringifiedMetadata.includes(value)
    }
  } catch (error) {
    logError('Error in fuzzyFilter', {
      error,
      row,
      columnId,
      value,
    })
    return false
  }

  const itemRank = rankItem(row.getValue(columnId), value)

  addMeta({ itemRank })

  return itemRank.passed
}

export const dateRangeFilter: FilterFn<SandboxWithMetrics> = (
  row,
  columnId,
  value: DateRange,
  addMeta
) => {
  const startedAt = row.getValue(columnId) as string

  if (!startedAt) return false

  const startedAtDate = new Date(startedAt)

  if (!value.from || !value.to) return true

  return isWithinInterval(startedAtDate, {
    start: value.from,
    end: value.to,
  })
}

export const resourceRangeFilter: FilterFn<SandboxWithMetrics> = (
  row,
  columnId,
  value: number
) => {
  if (columnId === 'cpuCount') {
    const rowValue = row.original.cpuCount
    if (!rowValue || !value || value === 0) return true
    return rowValue === value
  }

  if (columnId === 'memoryMB') {
    const rowValue = row.original.memoryMB
    if (!rowValue || !value || value === 0) return true
    return rowValue === value
  }

  return true
}

// TABLE CONFIG

export const fallbackData: SandboxWithMetrics[] = []

export const COLUMNS: ColumnDef<SandboxWithMetrics>[] = [
  {
    accessorKey: 'sandboxID',
    header: 'ID',
    cell: IdCell,
    size: 190,
    minSize: 100,
    enableColumnFilter: false,
    enableSorting: false,
    enableGlobalFilter: true,
  },
  {
    accessorKey: 'templateID',
    id: 'template',
    header: 'TEMPLATE',
    cell: TemplateCell,
    size: 250,
    minSize: 180,
    filterFn: 'arrIncludesSome',
    enableGlobalFilter: true,
  },
  {
    id: 'cpuUsage',
    header: 'CPU Usage',
    accessorFn: (row) => row.metrics?.cpuUsedPct,
    cell: ({ row }) => (
      <CpuUsageCell
        metrics={row.original.metrics}
        cpuCount={row.original.cpuCount ?? null}
      />
    ),
    size: 175,
    minSize: 120,
    enableSorting: true,
    enableColumnFilter: false,
  },
  {
    id: 'ramUsage',
    header: 'Memory Usage',
    accessorFn: (row) => {
      if (row.metrics?.memUsedMb && row.metrics.memTotalMb) {
        return (row.metrics.memUsedMb / row.metrics.memTotalMb) * 100
      }
      return 0
    },
    cell: ({ row }) => (
      <RamUsageCell
        metrics={row.original.metrics}
        memoryMB={row.original.memoryMB}
      />
    ),
    size: 175,
    minSize: 160,
    enableSorting: true,
    enableColumnFilter: false,
  },
  {
    id: 'metadata',
    accessorFn: (row) => JSON.stringify(row.metadata ?? {}),
    header: 'Metadata',
    cell: MetadataCell,
    filterFn: 'includesStringSensitive',
    enableGlobalFilter: true,
    size: 200,
    minSize: 160,
  },
  {
    id: 'startedAt',
    accessorKey: 'startedAt',
    header: 'Started At',
    cell: StartedAtCell,
    size: 250,
    minSize: 140,
    // @ts-expect-error dateRange is not a valid filterFn
    filterFn: 'dateRange',
    enableColumnFilter: true,
    enableGlobalFilter: false,
    sortingFn: (rowA, rowB) => {
      return rowA.original.startedAt.localeCompare(rowB.original.startedAt)
    },
  },
]
