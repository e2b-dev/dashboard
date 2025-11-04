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
      <TableCell
        colSpan={colSpan}
        className={cn(
          'flex h-48 w-full items-center justify-center text-center',
          className
        )}
      >
        <Loader />
      </TableCell>
    </TableRow>
  )
}
