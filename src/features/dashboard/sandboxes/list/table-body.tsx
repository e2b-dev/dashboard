import { type RefObject, useEffect } from 'react'
import { useVirtualRows } from '@/lib/hooks/use-virtual-rows'
import { DataTableBody } from '@/ui/data-table'
import { LoadMoreButton } from '@/ui/pagination-buttons'
import { Button } from '@/ui/primitives/button'
import { AddIcon, CloseIcon } from '@/ui/primitives/icons'
import SandboxesListEmpty from './empty'
import { useSandboxListTableStore } from './stores/table-store'
import type { SandboxListRow, SandboxListTable } from './table-config'
import { SandboxesTableRow } from './table-row'

const ROW_HEIGHT_PX = 32
const VIRTUAL_OVERSCAN = 8
const PREFETCH_THRESHOLD = 8

interface SandboxesTableBodyProps {
  table: SandboxListTable
  scrollRef: RefObject<HTMLDivElement | null>
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
}

export const SandboxesTableBody = ({
  table,
  scrollRef,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: SandboxesTableBodyProps) => {
  'use no memo'

  const resetFilters = useSandboxListTableStore((state) => state.resetFilters)
  const hasFilter = useSandboxListTableStore((state) => {
    return (
      state.startedAtFilter !== undefined ||
      state.templateFilters.length > 0 ||
      state.cpuCount !== undefined ||
      state.memoryMB !== undefined ||
      Boolean(state.globalFilter)
    )
  })

  const centerRows = table.getCenterRows()
  const {
    virtualRows,
    totalHeight: virtualizedTotalHeight,
    paddingTop: virtualPaddingTop,
    virtualizer,
  } = useVirtualRows<SandboxListRow>({
    rows: centerRows,
    scrollRef,
    estimateSizePx: ROW_HEIGHT_PX,
    overscan: VIRTUAL_OVERSCAN,
  })

  // During initial virtualizer mount, virtualRows can be temporarily empty
  // even when centerRows already has data.
  const rows = virtualRows.length > 0 ? virtualRows : centerRows

  const lastVisibleIndex = virtualizer.getVirtualItems().at(-1)?.index ?? -1

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

  const isEmpty = centerRows.length === 0

  if (isEmpty) {
    const emptyState = hasFilter ? (
      <SandboxesListEmpty
        title="No Results Found"
        description="No sandboxes match your current filters."
        actions={
          <Button variant="secondary" onClick={resetFilters} className="w-full">
            Reset Filters <CloseIcon className="text-fg-tertiary size-4" />
          </Button>
        }
        className="h-full max-md:sticky max-md:left-0 max-md:w-[calc(100svw-1.5rem)]"
      />
    ) : (
      <SandboxesListEmpty
        title="No Sandboxes Yet"
        description="Running and paused sandboxes can be observed here."
        actions={
          <Button variant="secondary" asChild className="w-full gap-2">
            <a href="/docs/quickstart" target="_blank" rel="noopener">
              <AddIcon />
              Create a Sandbox
            </a>
          </Button>
        }
        className="h-full max-md:sticky max-md:left-0 max-md:w-[calc(100svw-1.5rem)]"
      />
    )

    return (
      <DataTableBody className="h-[calc(100%-2rem-1px)] overflow-hidden">
        {emptyState}
      </DataTableBody>
    )
  }

  return (
    <>
      <DataTableBody virtualizedTotalHeight={virtualizedTotalHeight}>
        {virtualPaddingTop > 0 && <div style={{ height: virtualPaddingTop }} />}
        {rows.map((row) => (
          <SandboxesTableRow key={row.id} row={row} />
        ))}
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
