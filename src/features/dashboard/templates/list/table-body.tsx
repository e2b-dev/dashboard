import { flexRender, type Table } from '@tanstack/react-table'
import { type RefObject, useEffect } from 'react'
import type { Template } from '@/core/modules/templates/models'
import { useVirtualRows } from '@/lib/hooks/use-virtual-rows'
import { DataTableBody, DataTableCell, DataTableRow } from '@/ui/data-table'
import Empty from '@/ui/empty'
import { Button } from '@/ui/primitives/button'
import { CloseIcon, ExternalLinkIcon } from '@/ui/primitives/icons'
import { useTemplateTableStore } from './stores/table-store'

const ROW_HEIGHT_PX = 32
const VIRTUAL_OVERSCAN = 8
const INITIAL_FALLBACK_ROW_COUNT = 100
const PREFETCH_THRESHOLD = 8

interface TemplatesTableBodyProps {
  templates: Template[] | undefined
  table: Table<Template>
  scrollRef: RefObject<HTMLDivElement | null>
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
}

export function TemplatesTableBody({
  templates,
  table,
  scrollRef,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: TemplatesTableBodyProps) {
  'use no memo'

  const { resetFilters, globalFilter, cpuCount, memoryMB, isPublic } =
    useTemplateTableStore()

  const centerRows = table.getCenterRows()
  const {
    virtualRows,
    virtualizer,
    totalHeight: virtualizedTotalHeight,
    paddingTop: virtualPaddingTop,
  } = useVirtualRows<Template>({
    rows: centerRows,
    scrollRef,
    estimateSizePx: ROW_HEIGHT_PX,
    overscan: VIRTUAL_OVERSCAN,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const lastVisibleIndex = virtualItems[virtualItems.length - 1]?.index ?? -1

  // Load the next page as the user scrolls near the bottom of the list.
  useEffect(() => {
    if (
      hasNextPage &&
      !isFetchingNextPage &&
      lastVisibleIndex >= centerRows.length - PREFETCH_THRESHOLD
    ) {
      fetchNextPage()
    }
  }, [
    hasNextPage,
    isFetchingNextPage,
    lastVisibleIndex,
    centerRows.length,
    fetchNextPage,
  ])

  const rows =
    virtualRows.length > 0
      ? virtualRows
      : centerRows.slice(0, INITIAL_FALLBACK_ROW_COUNT)

  const isEmpty = templates && centerRows.length === 0

  const hasFilter =
    Boolean(globalFilter) ||
    cpuCount !== undefined ||
    memoryMB !== undefined ||
    isPublic !== undefined

  if (isEmpty) {
    if (hasFilter) {
      return (
        <Empty
          title="No Results Found"
          description="No templates match your current filters"
          message={
            <Button onClick={resetFilters}>
              Reset Filters <CloseIcon />
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
          <Button asChild>
            <a href="/docs/sandbox-template" target="_blank" rel="noopener">
              Create a Template
              <ExternalLinkIcon />
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
