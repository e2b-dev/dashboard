import { DataTableCell, DataTableRow } from '@/ui/data-table'
import { flexRender, Row } from '@tanstack/react-table'
import { memo } from 'react'
import { SandboxWithMetrics } from './table-config'

interface TableRowProps {
  row: Row<SandboxWithMetrics>
}

export const TableRow = memo(function TableRow({ row }: TableRowProps) {
  return (
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
  )
})
