'use client'

import { cn } from '@/lib/utils'
import { Loader } from '@/ui/primitives/loader'
import { TableCell, TableRow } from '@/ui/primitives/table'

interface TableLoaderProps {
  colSpan?: number
  className?: string
}

export function TableLoader({ colSpan = 100, className }: TableLoaderProps) {
  return (
    <TableRow className={className}>
      <TableCell colSpan={colSpan} className="h-48">
        <div
          className={cn('flex w-full items-center justify-center', className)}
        >
          <Loader />
        </div>
      </TableCell>
    </TableRow>
  )
}
