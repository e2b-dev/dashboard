import { flexRender, type Table } from '@tanstack/react-table'
import type { RefObject } from 'react'
import type { Template } from '@/core/modules/templates/models'
import { useVirtualRows } from '@/lib/hooks/use-virtual-rows'
import { cn } from '@/lib/utils'
import { DataTableBody, DataTableCell, DataTableRow } from '@/ui/data-table'
import Empty from '@/ui/empty'
import { LoadMoreButton } from '@/ui/pagination-buttons'
import { Button } from '@/ui/primitives/button'
import { CloseIcon, ExternalLinkIcon } from '@/ui/primitives/icons'
import { RowHoverFrame } from '@/ui/row-hover-frame'
import { useTemplateTableStore } from './stores/table-store'

const ROW_HEIGHT_PX = 32
const VIRTUAL_OVERSCAN = 8
const INITIAL_FALLBACK_ROW_COUNT = 100

interface TemplatesTableBodyProps {
  templates: Template[] | undefined
  table: Table<Template>
  scrollRef: RefObject<HTMLDivElement | null>
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  isRefetching: boolean
  onRowClick: (template: Template) => void
}

export function TemplatesTableBody({
  templates,
  table,
  scrollRef,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isRefetching,
  onRowClick,
}: TemplatesTableBodyProps) {
  'use no memo'

  const { resetFilters, globalFilter, isPublic } = useTemplateTableStore()

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

  const rows =
    virtualRows.length > 0
      ? virtualRows
      : centerRows.slice(0, INITIAL_FALLBACK_ROW_COUNT)

  const isEmpty = templates && centerRows.length === 0

  const hasFilter = Boolean(globalFilter) || isPublic !== undefined

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
    <>
      <DataTableBody
        virtualizedTotalHeight={virtualizedTotalHeight}
        className={cn(isRefetching && 'opacity-70 transition-opacity')}
      >
        {virtualPaddingTop > 0 && <div style={{ height: virtualPaddingTop }} />}
        {rows.map((row) => {
          const isDefault =
            'isDefault' in row.original && row.original.isDefault

          return (
            <DataTableRow
              key={row.id}
              isSelected={row.getIsSelected()}
              onClick={isDefault ? undefined : () => onRowClick(row.original)}
              className={cn(
                'group/row relative h-8 min-w-full -mx-2 px-2 hover:bg-bg-1 border-b-0 transition-none w-[calc(100%+16px)]',
                'border-stroke/80 hover:z-20 focus-within:z-10',
                'has-[button[aria-haspopup=menu][data-state=open]]:z-10',
                !isDefault && 'cursor-pointer'
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <DataTableCell key={cell.id} cell={cell}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </DataTableCell>
              ))}
              <RowHoverFrame
                className={cn(
                  'group-has-[button[aria-haspopup=menu][data-state=open]]/row:border-stroke',
                  'group-has-[button[aria-haspopup=menu][data-state=open]]/row:[--corner-mark-color:var(--color-fg-tertiary)]'
                )}
              />
            </DataTableRow>
          )
        })}
      </DataTableBody>

      {hasNextPage && (
        <div className="flex items-center justify-center py-3 text-fg-tertiary max-md:sticky max-md:left-0 max-md:w-[calc(100svw-1.5rem)]">
          <LoadMoreButton
            isLoading={isFetchingNextPage}
            onLoadMore={fetchNextPage}
          />
        </div>
      )}
    </>
  )
}
