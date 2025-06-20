import { memo } from 'react'
import { Row } from '@tanstack/react-table'
import { DataTableCell, DataTableRow } from '@/ui/data-table'
import { flexRender } from '@tanstack/react-table'
import { Sandbox } from '@/types/api'
import { useParams, useRouter, useSelectedLayoutSegment } from 'next/navigation'
import { PROTECTED_URLS } from '@/configs/urls'
import Link from 'next/link'

interface TableRowProps {
  row: Row<Sandbox>
}

export const TableRow = memo(function TableRow({ row }: TableRowProps) {
  const { teamIdOrSlug } = useParams()
  const sandboxId = `${row.original.sandboxID}-${row.original.clientID}`

  if (!teamIdOrSlug || typeof teamIdOrSlug !== 'string') {
    return null
  }

  return (
    <Link href={PROTECTED_URLS.SANDBOX_INSPECT(teamIdOrSlug, sandboxId)}>
      <DataTableRow
        key={row.id}
        className="hover:bg-bg-100 cursor-pointer"
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
