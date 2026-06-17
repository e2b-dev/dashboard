import { flexRender, type Table } from '@tanstack/react-table'
import type { RefObject } from 'react'
import type { ListedBuildModel } from '@/core/modules/builds/models'
import { useVirtualRows } from '@/lib/hooks/use-virtual-rows'
import { cn } from '@/lib/utils'
import { DataTableBody, DataTableCell, DataTableRow } from '@/ui/data-table'
import { RowHoverFrame } from '@/ui/row-hover-frame'
import { isRightAlignedColumn } from './table-config'

const ROW_HEIGHT_PX = 40
const VIRTUAL_OVERSCAN = 8
const INITIAL_FALLBACK_ROW_COUNT = 100

interface BuildsTableBodyProps {
  table: Table<ListedBuildModel>
  scrollRef: RefObject<HTMLDivElement | null>
  onRowClick: (build: ListedBuildModel) => void
}

export function BuildsTableBody({
  table,
  scrollRef,
  onRowClick,
}: BuildsTableBodyProps) {
  'use no memo'

  const rows = table.getRowModel().rows
  const {
    virtualRows,
    totalHeight: virtualizedTotalHeight,
    paddingTop: virtualPaddingTop,
  } = useVirtualRows<ListedBuildModel>({
    rows,
    scrollRef,
    estimateSizePx: ROW_HEIGHT_PX,
    overscan: VIRTUAL_OVERSCAN,
  })

  const renderedRows =
    virtualRows.length > 0
      ? virtualRows
      : rows.slice(0, INITIAL_FALLBACK_ROW_COUNT)

  return (
    <DataTableBody virtualizedTotalHeight={virtualizedTotalHeight}>
      {virtualPaddingTop > 0 && <div style={{ height: virtualPaddingTop }} />}
      {renderedRows.map((row) => {
        const isBuilding = row.original.status === 'building'

        return (
          <DataTableRow
            key={row.id}
            className={cn(
              'group/row relative h-10 min-w-full cursor-pointer -mx-2 px-2 hover:bg-bg-1 border-b-0 transition-none w-[calc(100%+16px)]',
              'border-stroke/80 hover:z-20 focus-within:z-10',
              { 'bg-bg-1 animate-pulse': isBuilding }
            )}
            onClick={() => onRowClick(row.original)}
          >
            {row.getVisibleCells().map((cell) => (
              <DataTableCell
                key={cell.id}
                cell={cell}
                className={cn(
                  'shrink-0',
                  isRightAlignedColumn(cell.column.id) && 'justify-end'
                )}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </DataTableCell>
            ))}
            <RowHoverFrame />
          </DataTableRow>
        )
      })}
    </DataTableBody>
  )
}
