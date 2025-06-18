import { DataTableCell, DataTableRow } from '@/ui/data-table'
import { flexRender, Row } from '@tanstack/react-table'
import { memo } from 'react'
import { SandboxWithMetrics } from './table-config'
import { useParams, useRouter, useSelectedLayoutSegment } from 'next/navigation'
import { PROTECTED_URLS } from '@/configs/urls'

interface TableRowProps {
  row: Row<SandboxWithMetrics>
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
      isSelected={row.getIsSelected()}
      className="h-8 cursor-pointer border-b"
      onClick={() => {
        router.push(
          PROTECTED_URLS.SANDBOX_INSPECT(
            teamIdOrSlug,
            `${row.original.sandboxID}-${row.original.clientID}`
          )
        )
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <DataTableCell key={cell.id} cell={cell}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </DataTableCell>
      ))}
    </DataTableRow>
  )
})
