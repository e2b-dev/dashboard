import { Sandbox } from '@/types/api.types'
import { DataTableBody } from '@/ui/data-table'
import Empty from '@/ui/empty'
import { Button } from '@/ui/primitives/button'
import { AddIcon, CloseIcon } from '@/ui/primitives/icons'
import { Row } from '@tanstack/react-table'
import { memo, useMemo } from 'react'
import { useSandboxTableStore } from './stores/table-store'
import { SandboxesTable, SandboxWithMetrics } from './table-config'
import { TableRow } from './table-row'

interface TableBodyProps {
  sandboxes: Sandbox[] | undefined
  table: SandboxesTable
  visualRows: Row<SandboxWithMetrics>[]
  virtualizedTotalHeight?: number
  virtualPaddingTop?: number
}

export const TableBody = memo(function TableBody({
  sandboxes,
  table,
  visualRows,
  virtualizedTotalHeight,
  virtualPaddingTop = 0,
}: TableBodyProps) {
  const resetFilters = useSandboxTableStore((state) => state.resetFilters)

  const isEmpty = sandboxes && visualRows?.length === 0

  const hasFilter = useMemo(() => {
    return (
      Object.values(table.getState().columnFilters).some(
        (filter) => filter.value !== undefined
      ) || table.getState().globalFilter !== ''
    )
  }, [table])

  if (isEmpty) {
    if (hasFilter) {
      return (
        <Empty
          title="No Results Found"
          description="No sandboxes match your current filters"
          message={
            <Button variant="primary" onClick={resetFilters}>
              <CloseIcon /> Reset Filters
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
          <Button variant="primary" asChild>
            <a href="/docs/quickstart" target="_blank" rel="noopener">
              <AddIcon />
              Create a Sandbox
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
      {visualRows.map((row) => (
        <TableRow key={row.id} row={row} />
      ))}
    </DataTableBody>
  )
})
