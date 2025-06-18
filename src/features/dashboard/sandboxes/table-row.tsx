import { memo } from 'react'
import { Row } from '@tanstack/react-table'
import { DataTableCell, DataTableRow } from '@/ui/data-table'
import { flexRender } from '@tanstack/react-table'
import { Sandbox } from '@/types/api'
import { useParams, useRouter, useSelectedLayoutSegment } from 'next/navigation'
import { PROTECTED_URLS } from '@/configs/urls'

interface TableRowProps {
  row: Row<Sandbox>
}

export const TableRow = memo(function TableRow({ row }: TableRowProps) {
  const router = useRouter()
  const { teamIdOrSlug } = useParams()

  if (!teamIdOrSlug || typeof teamIdOrSlug !== 'string') {
    return null
  }

  return (
    <DataTableRow
      key={row.id}
      onClick={() => {
        router.push(
          PROTECTED_URLS.SANDBOX_INSPECT(
            teamIdOrSlug,
            `${row.original.sandboxID}-${row.original.clientID}`
          )
        )
      }}
      className="cursor-pointer"
      isSelected={row.getIsSelected()}
    >
      {row.getVisibleCells().map((cell) => (
        <DataTableCell key={cell.id} cell={cell}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </DataTableCell>
      ))}
    </DataTableRow>
  )
})
