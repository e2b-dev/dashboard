import { useVirtualRows } from '@/lib/hooks/use-virtual-rows'
import { Template } from '@/types/api.types'
import { DataTableBody, DataTableCell, DataTableRow } from '@/ui/data-table'
import Empty from '@/ui/empty'
import { Button } from '@/ui/primitives/button'
import { flexRender, Row, Table } from '@tanstack/react-table'
import { ExternalLink, X } from 'lucide-react'
import { type RefObject } from 'react'
import { useTemplateTableStore } from './stores/table-store'

const ROW_HEIGHT_PX = 32
const VIRTUAL_OVERSCAN = 8

interface TemplatesTableBodyProps {
  templates: Template[] | undefined
  table: Table<Template>
  scrollRef: RefObject<HTMLDivElement | null>
}

export function TemplatesTableBody({
  templates,
  table,
  scrollRef,
}: TemplatesTableBodyProps) {
  'use no memo'

  const resetFilters = useTemplateTableStore((state) => state.resetFilters)

  const centerRows = table.getCenterRows()
  const {
    virtualRows,
    totalHeight: virtualizedTotalHeight,
    paddingTop: virtualPaddingTop,
  } = useVirtualRows<Template>({
    rows: centerRows,
    scrollRef,
    estimateSizePx: ROW_HEIGHT_PX,
    overscan: VIRTUAL_OVERSCAN,
  })

  // During initial virtualizer mount, virtualRows can be temporarily empty
  // even when centerRows already has data.
  const rows = virtualRows.length > 0 ? virtualRows : centerRows

  const isEmpty = templates && centerRows.length === 0

  const hasFilter =
    Object.values(table.getState().columnFilters).some(
      (filter) => filter.value !== undefined
    ) || table.getState().globalFilter !== ''

  if (isEmpty) {
    if (hasFilter) {
      return (
        <Empty
          title="No Results Found"
          description="No templates match your current filters"
          message={
            <Button variant="default" onClick={resetFilters}>
              Reset Filters <X className="text-accent-main-highlight size-4" />
            </Button>
          }
          className="h-[70%] max-md:sticky max-md:left-0 max-md:w-[calc(100svw-1.5rem)]"
        />
      )
    }

    return (
      <Empty
        title="No Templates Yet"
        description="Your Templates can be managed here"
        message={
          <Button variant="default" asChild>
            <a href="/docs/sandbox-template" target="_blank" rel="noopener">
              Create a Template
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        }
        className="h-[70%] max-md:sticky max-md:left-0 max-md:w-[calc(100svw-1.5rem)]"
      />
    )
  }

  return (
    <DataTableBody virtualizedTotalHeight={virtualizedTotalHeight}>
      {virtualPaddingTop > 0 && <div style={{ height: virtualPaddingTop }} />}
      {rows.map((row) => (
        <DataTableRow
          key={row.id}
          isSelected={row.getIsSelected()}
          className="h-8 border-b"
        >
          {row.getVisibleCells().map((cell) => (
            <DataTableCell key={cell.id} cell={cell}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </DataTableCell>
          ))}
        </DataTableRow>
      ))}
    </DataTableBody>
  )
}
