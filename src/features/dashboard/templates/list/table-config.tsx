'use client'

import { DefaultTemplate, Template } from '@/types/api.types'
import { rankItem } from '@tanstack/match-sorter-utils'
import {
  ColumnDef,
  FilterFn,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  TableOptions,
} from '@tanstack/react-table'
import posthog from 'posthog-js'
import { useMemo } from 'react'
import {
  ActionsCell,
  CpuCell,
  CreatedAtCell,
  EnvdVersionCell,
  MemoryCell,
  TemplateIdCell,
  TemplateNameCell,
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
        accessorKey: 'name',
        accessorFn: (row) => row.names.join(', '),
        header: 'Name',
        size: 312,
        minSize: 140,
        maxSize: 400,
        enableResizing: true,
        cell: TemplateNameCell,
      },
      {
        accessorKey: 'templateID',
        header: 'ID',
        size: 156,
        enableResizing: false,
        cell: TemplateIdCell,
      },
      {
        accessorKey: 'cpuCount',
        header: 'CPU',
        size: 64,
        enableResizing: false,
        cell: CpuCell,
        filterFn: 'equals',
        sortDescFirst: true,
      },
      {
        accessorKey: 'memoryMB',
        header: 'Memory',
        size: 80,
        enableResizing: false,
        cell: MemoryCell,
        filterFn: 'equals',
        sortDescFirst: true,
      },
      {
        accessorKey: 'createdAt',
        enableGlobalFilter: true,
        id: 'createdAt',
        header: 'Created',
        size: 150,
        enableResizing: false,
        cell: CreatedAtCell,
        sortDescFirst: true,
        sortingFn: (rowA, rowB) => {
          return rowA.original.createdAt.localeCompare(rowB.original.createdAt)
        },
      },
      {
        accessorKey: 'updatedAt',
        id: 'updatedAt',
        header: 'Updated',
        size: 150,
        enableGlobalFilter: true,
        enableResizing: false,
        cell: UpdatedAtCell,
        sortDescFirst: true,
        sortingFn: (rowA, rowB) => {
          return rowA.original.updatedAt.localeCompare(rowB.original.updatedAt)
        },
      },
      {
        accessorKey: 'public',
        header: 'Visibility',
        size: 80,
        enableResizing: false,
        cell: VisibilityCell,
        enableSorting: false,
        filterFn: 'equals',
      },
      {
        accessorKey: 'envdVersion',
        header: 'ENVD Ver.',
        size: 40,
        enableResizing: false,
        cell: EnvdVersionCell,
        enableSorting: false,
      },
      {
        id: 'actions',
        enableSorting: false,
        enableGlobalFilter: false,
        enableResizing: false,
        size: 35,
        cell: ActionsCell,
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
  enableSortingRemoval: false,
  columnResizeMode: 'onChange',
  enableColumnResizing: true,
  enableGlobalFilter: true,
  // @ts-expect-error globalFilterFn is not a valid option
  globalFilterFn: 'fuzzy',
}
