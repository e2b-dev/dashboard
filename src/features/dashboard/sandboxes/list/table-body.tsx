import { DataTableBody } from '@/ui/data-table'
import Empty from '@/ui/empty'
import { Button } from '@/ui/primitives/button'
import type { Row } from '@tanstack/react-table'
import { ExternalLink, X } from 'lucide-react'
import { memo } from 'react'
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
  const rows = virtualRows ?? table.getCenterRows()

  const isEmpty = rows.length === 0

  const { columnFilters, globalFilter } = table.getState()
  const hasFilter = columnFilters.length > 0 || Boolean(globalFilter)

  if (isEmpty) {
    if (hasFilter) {
      return (
        <Empty
          title="No Results Found"
          description="No sandboxes match your current filters"
          message={
            <Button variant="default" onClick={resetFilters}>
              Reset Filters <X className="text-accent-main-highlight size-4" />
            </Button>
          }
          className="h-[70%] max-md:w-screen"
        />
      )
    }

    return (
      <Empty
        title="No Sandboxes Yet"
        description="Running Sandboxes can be observed here"
        message={
          <Button variant="default" asChild>
            <a href="/docs/quickstart" target="_blank" rel="noopener">
              Create a Sandbox
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        }
        className="h-[70%] max-md:w-screen"
      />
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
