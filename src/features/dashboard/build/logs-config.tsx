import type { BuildLogDTO } from '@/server/api/models/builds.models'
import { rankItem } from '@tanstack/match-sorter-utils'
import {
  createColumnHelper,
  FilterFn,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table'

const columnHelper = createColumnHelper<BuildLogDTO>()

export const fuzzyFilter: FilterFn<BuildLogDTO> = (
  row,
  columnId,
  value,
  addMeta
) => {
  if (!value || !value.length) return true

  const rowValue = row.getValue(columnId)
  if (rowValue == null) return false

  const itemRank = rankItem(String(rowValue).toLowerCase(), value.toLowerCase())
  addMeta({ itemRank })

  return itemRank.passed
}

export const columns = [
  columnHelper.accessor('timestampUnix', {
    header: 'Timestamp',
    enableGlobalFilter: false,
    sortingFn: 'auto',
  }),
  columnHelper.accessor('level', {
    header: 'Level',
    enableGlobalFilter: false,
  }),
  columnHelper.accessor('message', {
    header: 'Message',
    enableGlobalFilter: true,
  }),
]

export const defaultSorting: SortingState = [
  { id: 'timestampUnix', desc: true },
]

export const getLogsTableOptions = () => ({
  filterFns: { fuzzy: fuzzyFilter },
  getCoreRowModel: getCoreRowModel<BuildLogDTO>(),
  getFilteredRowModel: getFilteredRowModel<BuildLogDTO>(),
  getSortedRowModel: getSortedRowModel<BuildLogDTO>(),
  globalFilterFn: fuzzyFilter,
})
