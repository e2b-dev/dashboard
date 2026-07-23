import { flexRender, type Row } from '@tanstack/react-table'
import Link from 'next/link'
import { memo } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import { DataTableCell, DataTableRow } from '@/ui/data-table'
import type { SandboxListRow } from './table-config'

interface SandboxesTableRowProps {
  row: Row<SandboxListRow>
}

export const SandboxesTableRow = memo(function SandboxesTableRow({
  row,
}: SandboxesTableRowProps) {
  return (
    <Link
      href={PROTECTED_URLS.SANDBOX(row.original.sandboxID)}
      prefetch={false}
      passHref
    >
      <DataTableRow
        className="h-8 cursor-pointer hover:bg-bg-1"
        isSelected={row.getIsSelected()}
      >
        {row.getVisibleCells().map((cell) => (
          <DataTableCell key={cell.id} cell={cell}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </DataTableCell>
        ))}
      </DataTableRow>
    </Link>
  )
})
