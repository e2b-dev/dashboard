'use client'

import {
  type ColumnDef,
  getCoreRowModel,
  getExpandedRowModel,
  type SortingState,
  type TableOptions,
} from '@tanstack/react-table'
import posthog from 'posthog-js'
import { useMemo } from 'react'
import { ActionsCell, BuildLinkCell, TagPillCell } from './table-cells'
import type { TagGroup } from './types'

export type TagGroupsServerSort =
  | 'latest_desc'
  | 'latest_asc'
  | 'name_asc'
  | 'name_desc'

const TAG_SEARCH_CHARSET = /[^a-z0-9._-]/g
const TAG_SEARCH_INPUT_REGEX = /^[a-zA-Z0-9._-]*$/
export const TAG_SEARCH_MAX_LEN = 64

export function hasInvalidTagSearchInput(raw: string): boolean {
  if (!raw) return false
  if (raw.length > TAG_SEARCH_MAX_LEN) return true
  return !TAG_SEARCH_INPUT_REGEX.test(raw)
}

/** Sanitized search sent to the server; omitted while the input is invalid. */
export function getActiveTagSearch(raw: string): string | undefined {
  if (hasInvalidTagSearchInput(raw)) return undefined
  const sanitized = sanitizeTagSearch(raw)
  return sanitized || undefined
}

export function sanitizeTagSearch(raw: string): string {
  if (!raw) return ''
  return raw
    .toLowerCase()
    .replace(TAG_SEARCH_CHARSET, '')
    .slice(0, TAG_SEARCH_MAX_LEN)
}

export function sortingToServerSort(
  sorting: SortingState
): TagGroupsServerSort {
  const head = sorting[0]
  if (!head || sorting.length !== 1) return 'latest_desc'
  if (head.id === 'tag') return head.desc ? 'name_desc' : 'name_asc'
  if (head.id === 'assignedAt') return head.desc ? 'latest_desc' : 'latest_asc'
  return 'latest_desc'
}

export function serverSortToSorting(sort: TagGroupsServerSort): SortingState {
  switch (sort) {
    case 'latest_desc':
      return [{ id: 'assignedAt', desc: true }]
    case 'latest_asc':
      return [{ id: 'assignedAt', desc: false }]
    case 'name_asc':
      return [{ id: 'tag', desc: false }]
    case 'name_desc':
      return [{ id: 'tag', desc: true }]
  }
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
        enableGlobalFilter: false,
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
  getCoreRowModel: getCoreRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
  manualSorting: true,
  manualFiltering: true,
  enableSorting: true,
  enableMultiSort: false,
  enableSortingRemoval: false,
  enableGlobalFilter: false,
  enableColumnResizing: false,
}
