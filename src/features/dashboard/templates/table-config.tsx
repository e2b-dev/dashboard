'use client'

import {
  ColumnDef,
  FilterFn,
  getSortedRowModel,
  getCoreRowModel,
  getFilteredRowModel,
  TableOptions,
} from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import { DefaultTemplate, Template } from '@/types/api'
import { useMemo } from 'react'
import posthog from 'posthog-js'
import {
  ActionsCell,
  TemplateIdCell,
  TemplateNameCell,
  CpuCell,
  MemoryCell,
  CreatedAtCell,
  UpdatedAtCell,
  VisibilityCell,
} from './table-cells'

// FILTERS
export const fuzzyFilter: FilterFn<unknown> = (
  row,
  columnId,
  value,
  addMeta
) => {
  // Skip undefined values
  if (!value || !value.length) return true

  const searchValue = value.toLowerCase()
  const rowValue = row.getValue(columnId)

  // Handle null/undefined row values
  if (rowValue == null) return false

  // Convert row value to string and lowercase for comparison
  const itemStr = String(rowValue).toLowerCase()
  const itemRank = rankItem(itemStr, searchValue)

  addMeta({
    itemRank,
  })

  return itemRank.passed
}

// TABLE CONFIG
export const fallbackData: (Template | DefaultTemplate)[] = []

export const trackTemplateTableInteraction = (
  action: string,
  properties: Record<string, unknown> = {}
) => {
  posthog.capture('template table interacted', {
    action,
    ...properties,
  })
}

export const useColumns = (deps: unknown[]) => {
  return useMemo<ColumnDef<Template | DefaultTemplate>[]>(
    () => [
      {
        id: 'actions',
        enableSorting: false,
        enableGlobalFilter: false,
        enableResizing: false,
        size: 35,
        cell: ActionsCell,
      },
      {
        accessorKey: 'templateID',
        header: 'ID',
        size: 160,
        minSize: 120,
        cell: TemplateIdCell,
      },
      {
        accessorKey: 'name',
        accessorFn: (row) => row.aliases?.[0],
        header: 'Name',
        size: 160,
        minSize: 120,
        cell: TemplateNameCell,
      },
      {
        accessorKey: 'cpuCount',
        header: 'CPU',
        size: 125,
        minSize: 125,
        cell: CpuCell,
        filterFn: 'equals',
      },
      {
        accessorKey: 'memoryMB',
        header: 'Memory',
        size: 140,
        minSize: 140,
        cell: MemoryCell,
        filterFn: 'equals',
      },
      {
        accessorKey: 'createdAt',
        enableGlobalFilter: true,
        id: 'createdAt',
        header: 'Created At',
        size: 250,
        minSize: 140,
        cell: CreatedAtCell,
        sortingFn: (rowA, rowB) => {
          return rowA.original.createdAt.localeCompare(rowB.original.createdAt)
        },
      },
      {
        accessorKey: 'updatedAt',
        id: 'updatedAt',
        header: 'Updated At',
        size: 250,
        minSize: 140,
        enableGlobalFilter: true,
        cell: UpdatedAtCell,
        sortingFn: (rowA, rowB) => {
          return rowA.original.updatedAt.localeCompare(rowB.original.updatedAt)
        },
      },
      {
        accessorKey: 'public',
        header: 'Visibility',
        size: 140,
        minSize: 100,
        cell: VisibilityCell,
        enableSorting: false,
        filterFn: 'equals',
      },
    ],
    deps
  )
}

export const templatesTableConfig: Partial<
  TableOptions<Template | DefaultTemplate>
> = {
  filterFns: {
    fuzzy: fuzzyFilter,
  },
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getSortedRowModel: getSortedRowModel(),
  enableSorting: true,
  enableMultiSort: false,
  columnResizeMode: 'onChange',
  enableColumnResizing: true,
  enableGlobalFilter: true,
  // @ts-expect-error globalFilterFn is not a valid option
  globalFilterFn: 'fuzzy',
}
