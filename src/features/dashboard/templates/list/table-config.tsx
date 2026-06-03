'use client'

import {
  type ColumnDef,
  getCoreRowModel,
  type TableOptions,
} from '@tanstack/react-table'
import posthog from 'posthog-js'
import { useMemo } from 'react'
import type { DefaultTemplate, Template } from '@/core/modules/templates/models'
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
        enableSorting: false,
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
        size: 172,
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
        size: 172,
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
  getCoreRowModel: getCoreRowModel(),
  // Sorting, filtering, and search are performed server-side; the table is a
  // pure renderer over the rows returned by the paginated query.
  manualSorting: true,
  manualFiltering: true,
  enableSorting: true,
  enableMultiSort: false,
  enableSortingRemoval: false,
  columnResizeMode: 'onChange',
  enableColumnResizing: true,
}
