import type { Column } from '@tanstack/react-table'
import { DataTableRow } from './data-table'
import { Skeleton } from './primitives/skeleton'

interface TableSkeletonProps {
  rows?: number
  columns: Column<unknown, unknown>[]
}

export function TableSkeleton({ rows = 30, columns }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <DataTableRow key={i} className="h-10 hover:bg-transparent">
          {columns.map((column, j) => (
            <div
              key={`skeleton-${i}-${j}`}
              style={{
                width: `calc(var(--col-${column.id}-size) * 1)`,
              }}
              className="flex items-center p-1 px-2 align-middle font-sans text-xs"
            >
              <Skeleton className="mr-6 h-6 w-full min-w-6" />
            </div>
          ))}
        </DataTableRow>
      ))}
    </>
  )
}
