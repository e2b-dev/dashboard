import { PROTECTED_URLS } from '@/configs/urls'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { DataTableCell, DataTableRow } from '@/ui/data-table'
import { type Row, flexRender } from '@tanstack/react-table'
import Link from 'next/link'
import { memo } from 'react'
import type { SandboxListRow } from './table-config'

interface SandboxesTableRowProps {
  row: Row<SandboxListRow>
}

export const SandboxesTableRow = memo(function SandboxesTableRow({
  row,
}: SandboxesTableRowProps) {
  const { teamIdOrSlug } =
    useRouteParams<'/dashboard/[teamIdOrSlug]/sandboxes'>()
  const sandboxDetailHref = PROTECTED_URLS.SANDBOX_INSPECT(
    teamIdOrSlug,
    row.original.sandboxID
  )

  return (
    <Link href={sandboxDetailHref} prefetch={false}>
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
