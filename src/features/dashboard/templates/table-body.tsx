import { Template } from '@/types/api'
import { DataTableBody, DataTableCell, DataTableRow } from '@/ui/data-table'
import Empty from '@/ui/empty'
import { Button } from '@/ui/primitives/button'
import { flexRender, Table } from '@tanstack/react-table'
import { ExternalLink, X } from 'lucide-react'
import { useMemo } from 'react'
import { useTemplateTableStore } from './stores/table-store'

interface TableBodyProps {
  templates: Template[] | undefined
  table: Table<Template>
  visualRowsCount: number
}

export function TableBody({
  templates,
  table,
  visualRowsCount,
}: TableBodyProps) {
  'use no memo'

  const resetFilters = useTemplateTableStore((state) => state.resetFilters)

  const centerRows = table.getCenterRows()

  const visualRows = useMemo(() => {
    return centerRows.slice(0, visualRowsCount)
  }, [centerRows, visualRowsCount])

  const isEmpty = templates && visualRows?.length === 0

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
          className="h-[70%] max-md:w-screen"
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
        className="h-[70%] max-md:w-screen"
      />
    )
  }

  return (
    <DataTableBody>
      {visualRows.map((row) => (
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
