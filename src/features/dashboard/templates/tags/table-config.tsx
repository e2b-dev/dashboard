'use client'

import { rankItem } from '@tanstack/match-sorter-utils'
import {
  type ColumnDef,
  type FilterFn,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type TableOptions,
} from '@tanstack/react-table'
import posthog from 'posthog-js'
import { useMemo } from 'react'
import { ActionsCell, BuildLinkCell, TagPillCell } from './table-cells'
import type { TagGroup } from './types'

export const fuzzyFilter: FilterFn<TagGroup> = (
  row,
  columnId,
  value,
  addMeta
) => {
  if (!value || !value.length) return true

  const searchValue = String(value).toLowerCase()
  const rowValue = row.getValue(columnId)

  if (rowValue == null) return false

  const itemStr = String(rowValue).toLowerCase()
  const itemRank = rankItem(itemStr, searchValue)

  addMeta({ itemRank })

  return itemRank.passed
}

export const fallbackData: TagGroup[] = []

export const trackTagTableInteraction = (
  action: string,
  properties: Record<string, unknown> = {}
) => {
  posthog.capture('tag table interacted', {
    action,
    ...properties,
  })
}

export const useTagColumns = () =>
  useMemo<ColumnDef<TagGroup>[]>(
    () => [
      {
        accessorKey: 'tag',
        id: 'tag',
        header: 'Name',
        cell: TagPillCell,
        enableSorting: true,
        enableGlobalFilter: true,
        sortingFn: (a, b) => a.original.tag.localeCompare(b.original.tag),
      },
      {
        accessorFn: (row) => row.primaryAssignment.assignedAt,
        id: 'assignedAt',
        header: 'Assigned to',
        size: 178,
        cell: BuildLinkCell,
        enableSorting: true,
        enableGlobalFilter: false,
        sortDescFirst: true,
        sortingFn: (a, b) =>
          a.original.primaryAssignment.assignedAt.localeCompare(
            b.original.primaryAssignment.assignedAt
          ),
      },
      {
        id: 'actions',
        size: 203,
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ActionsCell,
      },
    ],
    []
  )

export const tagsTableConfig: Partial<TableOptions<TagGroup>> = {
  getRowId: (row) => row.tag,
  filterFns: { fuzzy: fuzzyFilter },
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
  enableSorting: true,
  enableMultiSort: false,
  enableSortingRemoval: false,
  enableGlobalFilter: true,
  enableColumnResizing: false,
  // @ts-expect-error globalFilterFn keyed by string is valid at runtime
  globalFilterFn: 'fuzzy',
}
