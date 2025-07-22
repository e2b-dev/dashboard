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
import { useSandboxTableStore } from './stores/table-store'
import { Row } from '@tanstack/react-table'

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
  if (columnId === 'cpuUsage') {
    const rowValue = row.original.cpuCount
    if (!rowValue || !value || value === 0) return true
    return rowValue === value
  }

  if (columnId === 'ramUsage') {
    const rowValue = row.original.memoryMB
    if (!rowValue || !value || value === 0) return true
    return rowValue === value
  }

  return true
}

// ---------- Sorting functions that rely on live metrics in the zustand store ----------

const compareNumbers = (a: number, b: number) => (a === b ? 0 : a > b ? 1 : -1)

export const cpuMetricSortingFn = (
  rowA: Row<SandboxWithMetrics>,
  rowB: Row<SandboxWithMetrics>
) => {
  const metrics = useSandboxTableStore.getState().metrics

  const cpuA = metrics?.[rowA.original.sandboxID]?.cpuUsedPct ?? -1
  const cpuB = metrics?.[rowB.original.sandboxID]?.cpuUsedPct ?? -1

  return compareNumbers(cpuA, cpuB)
}

export const ramMetricSortingFn = (
  rowA: Row<SandboxWithMetrics>,
  rowB: Row<SandboxWithMetrics>
) => {
  const metrics = useSandboxTableStore.getState().metrics

  const mA = metrics?.[rowA.original.sandboxID]
  const mB = metrics?.[rowB.original.sandboxID]

  const ramA = mA && mA.memTotalMb ? mA.memUsedMb / mA.memTotalMb : -1
  const ramB = mB && mB.memTotalMb ? mB.memUsedMb / mB.memTotalMb : -1

  return compareNumbers(ramA, ramB)
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
    accessorFn: (row) => {
      const metrics = useSandboxTableStore.getState().metrics
      return metrics?.[row.sandboxID]?.cpuUsedPct ?? null
    },
    cell: (props) => <CpuUsageCell {...props} />,
    size: 175,
    minSize: 120,
    enableSorting: true,
    sortingFn: cpuMetricSortingFn,
    enableColumnFilter: false,
  },
  {
    id: 'ramUsage',
    header: 'Memory Usage',
    accessorFn: (row) => {
      const metrics = useSandboxTableStore.getState().metrics
      const m = metrics?.[row.sandboxID]
      if (m?.memUsedMb && m.memTotalMb) {
        return Number(((m.memUsedMb / m.memTotalMb) * 100).toFixed(2))
      }
      return null
    },
    cell: (props) => <RamUsageCell {...props} />,
    size: 175,
    minSize: 160,
    enableSorting: true,
    sortingFn: ramMetricSortingFn,
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
