'use client'

import { rankItem } from '@tanstack/match-sorter-utils'
import type { ColumnDef, FilterFn, Table } from '@tanstack/react-table'
import { isWithinInterval } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import type { Sandbox } from '@/types/api.types'

import {
  CpuUsageCell,
  DiskUsageCell,
  IdCell,
  MetadataCell,
  RamUsageCell,
  StartedAtCell,
  TemplateCell,
} from './table-cells'

export type SandboxListRow = Sandbox
export type SandboxListTable = Table<SandboxListRow>

// FILTERS

export const sandboxIdFuzzyFilter: FilterFn<SandboxListRow> = (
  row,
  columnId,
  value,
  addMeta
) => {
  if (!value) return true

  const rowValue = row.getValue(columnId)
  if (rowValue == null) return false

  const itemRank = rankItem(
    String(rowValue).toLowerCase(),
    String(value).toLowerCase()
  )

  addMeta({ itemRank })

  return itemRank.passed
}

export const startedAtDateRangeFilter: FilterFn<SandboxListRow> = (
  row,
  columnId,
  value: DateRange
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

export const resourceEqualsFilter: FilterFn<SandboxListRow> = (
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

export const templateIdentifierFilter: FilterFn<SandboxListRow> = (
  row,
  _,
  value: string[]
) => {
  if (!value || value.length === 0) return true

  const { alias, templateID } = row.original

  // check if any filter value matches either alias or templateID
  return value.some((filterValue) => {
    return (
      (alias && alias.toLowerCase() === filterValue.toLowerCase()) ||
      (templateID && templateID.toLowerCase() === filterValue.toLowerCase())
    )
  })
}

// TABLE CONFIG

export const sandboxListColumns: ColumnDef<SandboxListRow>[] = [
  {
    accessorKey: 'sandboxID',
    header: 'ID',
    cell: IdCell,
    size: 165,
    minSize: 100,
    enableResizing: false,
    enableColumnFilter: false,
    enableSorting: false,
    enableGlobalFilter: true,
  },
  {
    accessorFn: (row) => row.alias || row.templateID,
    id: 'template',
    header: 'TEMPLATE',
    cell: TemplateCell,
    size: 250,
    minSize: 100,
    maxSize: 350,
    enableResizing: true,
    filterFn: templateIdentifierFilter,
    enableGlobalFilter: false,
  },
  {
    id: 'cpuUsage',
    header: 'CPU',
    cell: (props) => <CpuUsageCell {...props} />,
    size: 100,
    enableResizing: false,
    enableSorting: false,
    enableColumnFilter: true,
    filterFn: resourceEqualsFilter,
  },
  {
    id: 'ramUsage',
    header: 'Memory',
    cell: (props) => <RamUsageCell {...props} />,
    size: 140,
    enableResizing: false,
    enableSorting: false,
    enableColumnFilter: true,
    filterFn: resourceEqualsFilter,
  },
  {
    id: 'diskUsage',
    header: 'Disk',
    cell: (props) => <DiskUsageCell {...props} />,
    size: 100,
    enableResizing: false,
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    id: 'metadata',
    accessorFn: (row) => JSON.stringify(row.metadata ?? {}),
    header: 'Metadata',
    cell: MetadataCell,
    filterFn: 'includesStringSensitive',
    enableGlobalFilter: false,
    size: 200,
    minSize: 160,
    enableResizing: true,
    enableSorting: false,
  },
  {
    id: 'startedAt',
    accessorKey: 'startedAt',
    header: 'Started At',
    cell: StartedAtCell,
    size: 150,
    enableResizing: false,
    filterFn: startedAtDateRangeFilter,
    enableColumnFilter: true,
    enableGlobalFilter: false,
    sortingFn: (rowA, rowB) => {
      return rowA.original.startedAt.localeCompare(rowB.original.startedAt)
    },
  },
]
