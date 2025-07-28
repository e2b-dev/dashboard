import { PROTECTED_URLS } from '@/configs/urls'
import { DataTableCell, DataTableRow } from '@/ui/data-table'
import { flexRender, Row } from '@tanstack/react-table'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { memo } from 'react'
import { SandboxWithMetrics } from './table-config'

interface TableRowProps {
  row: Row<SandboxWithMetrics>
}

export const TableRow = memo(function TableRow({ row }: TableRowProps) {
  const { teamIdOrSlug } = useParams()

  if (!teamIdOrSlug || typeof teamIdOrSlug !== 'string') {
    return null
  }

  return (
    <Link
      href={PROTECTED_URLS.SANDBOX_INSPECT(
        teamIdOrSlug,
        row.original.sandboxID
      )}
      prefetch={false}
    >
      <DataTableRow
        key={row.id}
        className="hover:bg-bg-100 h-8 cursor-pointer border-b"
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
