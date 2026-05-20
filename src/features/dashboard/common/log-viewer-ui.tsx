import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ArrowDownIcon, ListIcon } from '@/ui/primitives/icons'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'

interface LogsTableHeaderProps {
  timestampWidth: number
  levelWidth: number
  timestampSortDirection?: 'asc' | 'desc'
}

export function LogsTableHeader({
  timestampWidth,
  levelWidth,
  timestampSortDirection = 'desc',
}: LogsTableHeaderProps) {
  return (
    <TableHeader
      className="bg-bg"
      style={{ display: 'grid', position: 'sticky', top: 0, zIndex: 1 }}
    >
      <TableRow style={{ display: 'flex', minWidth: '100%' }}>
        <TableHead
          data-state="selected"
          className="px-0 h-min pb-3 pr-4 text-fg"
          style={{ display: 'flex', width: timestampWidth }}
        >
          Timestamp{' '}
          <ArrowDownIcon
            className={
              timestampSortDirection === 'asc' ? 'size-3 rotate-180' : 'size-3'
            }
          />
        </TableHead>
        <TableHead
          className="px-0 h-min pb-3 pr-4"
          style={{ display: 'flex', width: levelWidth }}
        >
          Level
        </TableHead>
        <TableHead
          className="px-0 h-min pb-3"
          style={{ display: 'flex', flex: 1 }}
        >
          Message
        </TableHead>
      </TableRow>
    </TableHeader>
  )
}

interface LogsEmptyBodyProps {
  description?: ReactNode
}

export function LogsEmptyBody({ description }: LogsEmptyBodyProps) {
  return (
    <TableBody style={{ display: 'grid' }}>
      <TableRow style={{ display: 'flex', minWidth: '100%', marginTop: 8 }}>
        <TableCell className="flex-1">
          <div className="h-[35vh] w-full gap-2 relative flex flex-col justify-center items-center p-6">
            <div className="flex items-center gap-2">
              <ListIcon className="size-5" />
              <p className="prose-body-highlight">No logs found</p>
            </div>
            {description ? (
              <p className="text-fg-tertiary text-sm">{description}</p>
            ) : null}
          </div>
        </TableCell>
      </TableRow>
    </TableBody>
  )
}

const STATUS_ROW_CELL_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'start',
}

interface LogStatusCellProps {
  className?: string
  children: ReactNode
}

export function LogStatusCell({ className, children }: LogStatusCellProps) {
  return (
    <TableCell
      colSpan={3}
      className={cn('py-0 w-full pl-1.5!', className)}
      style={STATUS_ROW_CELL_STYLE}
    >
      {children}
    </TableCell>
  )
}
