import { cn } from '@/lib/utils'
import { Button } from '@/ui/primitives/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/primitives/select'
import { Separator } from '@/ui/primitives/separator'
import { Cell, Header } from '@tanstack/react-table'
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpNarrowWide,
} from 'lucide-react'
import * as React from 'react'

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  header: Header<TData, TValue>
  canSort?: boolean
  sorting?: boolean
  align?: 'left' | 'right'
}

function DataTableHead<TData, TValue>({
  header,
  children,
  className,
  sorting,
  align = 'left',
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  const canSort = header.column.getCanSort()

  return (
    <div
      className={cn(
        'relative flex h-8 items-center align-middle group',
        'font-mono uppercase',
        '[&:has([role=checkbox])]:pr-0',
        sorting !== undefined ? 'prose-label-highlight text-fg' : 'prose-label text-fg-tertiary',
        className
      )}
      style={{
        width: `${header.getSize()}px`,
      }}
      {...props}
    >
      <div
        className={cn(
          'flex h-full w-full items-center gap-1 whitespace-nowrap',
          canSort && 'cursor-pointer group-hover:text-fg-secondary transition-colors',
          align === 'right' && 'flex-row-reverse'
        )}
        onClick={
          canSort
            ? () => header.column.toggleSorting(undefined, true)
            : undefined
        }
      >
        {children}
        {canSort && (
          <div className={cn(
            "size-5 min-w-5 flex items-center justify-center",
            sorting === undefined && "opacity-0 group-hover:opacity-100 transition-opacity"
          )}>
            {sorting === undefined ? (
              // Show the arrow for the next state based on sortDescFirst
              header.column.columnDef.sortDescFirst ? (
                <ArrowDownWideNarrow className="size-3" />
              ) : (
                <ArrowUpNarrowWide className="size-3" />
              )
            ) : sorting ? (
              <ArrowDownWideNarrow className="size-3" />
            ) : (
              <ArrowUpNarrowWide className="size-3" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface DataTableCellProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  cell: Cell<TData, TValue>
  children: React.ReactNode
}

function DataTableCell<TData, TValue>({
  cell,
  children,
  className,
  ...props
}: DataTableCellProps<TData, TValue>) {
  return (
    <div
      style={{
        width: `${cell.column.getSize()}px`,
      }}
      className={cn(
        'align-middle font-sans text-xs [&:has([role=checkbox])]:pr-0',
        'flex items-center',
        'text-fg-secondary prose-table',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface DataTableRowProps extends React.HTMLAttributes<HTMLDivElement> {
  isSelected?: boolean
}

const DataTableRow = React.forwardRef<HTMLDivElement, DataTableRowProps>(
  ({ children, className, isSelected, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'transition-colors',
          'flex w-full items-center gap-8',
          'border-b border-stroke/60',
          {
            'bg-bg-hover': isSelected,
          },
          'bg-bg',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

DataTableRow.displayName = 'DataTableRow'

interface DataTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const DataTable = React.forwardRef<HTMLDivElement, DataTableProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base table styles from table.tsx
          'w-full caption-bottom',
          'font-mono',
          // Div table styles
          'w-fit',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

DataTable.displayName = 'DataTable'

interface DataTableHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

function DataTableHeader({
  className,
  children,
  ...props
}: DataTableHeaderProps) {
  return (
    <div className={cn('border-b', className)} {...props}>
      {children}
    </div>
  )
}

interface DataTableBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  virtualizedTotalHeight?: number
}

function DataTableBody({
  className,
  children,
  virtualizedTotalHeight,
  ...props
}: DataTableBodyProps) {
  return (
    <div
      style={
        virtualizedTotalHeight
          ? {
              height: `${virtualizedTotalHeight}px`,
              position: 'relative',
              overflow: 'visible',
            }
          : {}
      }
      className={cn(className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface DataTablePaginationProps {
  className?: string
  pageSize: number
  pageIndex: number
  pageCount: number
  onPageSizeChange: (pageSize: number) => void
  onPageChange: (pageIndex: number) => void
}

function DataTablePagination({
  className,
  pageSize,
  pageIndex,
  pageCount,
  onPageSizeChange,
  onPageChange,
}: DataTablePaginationProps) {
  return (
    <div className={cn('flex items-center gap-8 border-t p-2 px-3', className)}>
      <div className="flex items-center gap-2 text-xs">
        <div className="text-fg-secondary">
          Page {pageIndex + 1} of {pageCount}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="iconSm"
            onClick={() => onPageChange(0)}
            disabled={pageIndex === 0}
          >
            ««
          </Button>
          <Button
            variant="outline"
            size="iconSm"
            onClick={() => onPageChange(pageIndex - 1)}
            disabled={pageIndex === 0}
          >
            «
          </Button>
          <Button
            variant="outline"
            size="iconSm"
            onClick={() => onPageChange(pageIndex + 1)}
            disabled={pageIndex === pageCount - 1}
          >
            »
          </Button>
          <Button
            variant="outline"
            size="iconSm"
            onClick={() => onPageChange(pageCount - 1)}
            disabled={pageIndex === pageCount - 1}
          >
            »»
          </Button>
        </div>
      </div>

      <div className="text-fg-secondary flex items-center gap-2 text-xs">
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="h-6 w-fit gap-1 border-none bg-transparent pr-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 30, 40, 50, 75, 100].map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>rows per page</span>
      </div>
    </div>
  )
}

export {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTablePagination,
  DataTableRow,
}
