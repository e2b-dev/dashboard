import { flexRender, type Row } from '@tanstack/react-table'
import Link from 'next/link'
import { memo } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { cn } from '@/lib/utils'
import { DataTableCell, DataTableRow } from '@/ui/data-table'
import { RowHoverFrame } from '@/ui/row-hover-frame'
import type { SandboxListRow } from './table-config'

interface SandboxesTableRowProps {
  row: Row<SandboxListRow>
}

export const SandboxesTableRow = memo(function SandboxesTableRow({
  row,
}: SandboxesTableRowProps) {
  const { teamSlug } = useRouteParams<'/dashboard/[teamSlug]/sandboxes'>()

  return (
    <DataTableRow
      className={cn(
        'group/row relative h-8 min-w-full cursor-pointer -mx-2 px-2 hover:bg-bg-1 border-b-0 transition-none w-[calc(100%+16px)]',
        'hover:z-20 focus-within:z-10'
      )}
      isSelected={row.getIsSelected()}
    >
      <Link
        href={PROTECTED_URLS.SANDBOX(teamSlug, row.original.sandboxID)}
        prefetch={false}
        aria-label={`Open sandbox ${row.original.sandboxID}`}
        className="absolute inset-0 z-1"
      />
      {row.getVisibleCells().map((cell) => (
        <DataTableCell key={cell.id} cell={cell}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </DataTableCell>
      ))}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-2 bottom-0 border-b border-stroke/80',
          'group-hover/row:hidden group-focus-visible/row:hidden'
        )}
      />
      <RowHoverFrame className="-top-px bottom-0" />
    </DataTableRow>
  )
})
