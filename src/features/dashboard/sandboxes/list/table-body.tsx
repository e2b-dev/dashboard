import { DataTableBody } from '@/ui/data-table'
import { Button } from '@/ui/primitives/button'
import type { Row } from '@tanstack/react-table'
import { ExternalLink, X } from 'lucide-react'
import { memo } from 'react'
import SandboxesListEmpty from './empty'
import { useSandboxListTableStore } from './stores/table-store'
import type { SandboxListRow, SandboxListTable } from './table-config'
import { SandboxesTableRow } from './table-row'

interface SandboxesTableBodyProps {
  table: SandboxListTable
  virtualRows?: Row<SandboxListRow>[]
  virtualizedTotalHeight?: number
  virtualPaddingTop?: number
}

export const SandboxesTableBody = memo(function SandboxesTableBody({
  table,
  virtualRows,
  virtualizedTotalHeight,
  virtualPaddingTop = 0,
}: SandboxesTableBodyProps) {
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
  const rows = virtualRows ?? table.getCenterRows()

  const isEmpty = rows.length === 0

  if (isEmpty) {
    const emptyState = hasFilter ? (
      <SandboxesListEmpty
        title="No Results Found"
        description="No sandboxes match your current filters."
        actions={
          <Button variant="outline" onClick={resetFilters} className="w-full">
            Reset Filters <X className="text-fg-tertiary size-4" />
          </Button>
        }
        className="h-full max-md:sticky max-md:left-0 max-md:w-[calc(100svw-1.5rem)]"
      />
    ) : (
      <SandboxesListEmpty
        title="No Sandboxes Yet"
        description="Running sandboxes can be observed here."
        actions={
          <Button variant="outline" asChild className="w-full gap-2">
            <a href="/docs/quickstart" target="_blank" rel="noopener">
              Create a Sandbox
              <ExternalLink className="size-3.5" />
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
    <DataTableBody virtualizedTotalHeight={virtualizedTotalHeight}>
      {virtualPaddingTop > 0 && <div style={{ height: virtualPaddingTop }} />}
      {rows.map((row) => (
        <SandboxesTableRow key={row.id} row={row} />
      ))}
    </DataTableBody>
  )
})
