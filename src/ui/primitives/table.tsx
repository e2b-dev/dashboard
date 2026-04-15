import * as React from 'react'

import { cn } from '@/lib/utils'
import { TableEmptyRowBorder } from './table-empty-row-border'

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <table
    ref={ref}
    className={cn('w-full caption-bottom', 'font-mono ', className)}
    {...props}
  />
))
Table.displayName = 'Table'

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('border-b', className)} {...props} />
))
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(
      '[&_tr:last-child]:border-0',
      '[&_tr]:border-b [&_tr]:border-stroke/80',
      className
    )}
    {...props}
  />
))
TableBody.displayName = 'TableBody'

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      'border-t border-dashed',
      'bg-bg-1 font-mono',
      '[&>tr]:last:border-b-0',
      className
    )}
    {...props}
  />
))
TableFooter.displayName = 'TableFooter'

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'transition-colors',
      'data-[state=selected]:bg-bg-hover',
      'bg-bg',
      className
    )}
    {...props}
  />
))
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & { children: React.ReactNode }
>(({ className, children, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-10 px-4 text-left align-middle',
      'font-mono prose-label uppercase',
      'text-fg-tertiary',
      'data-[state=selected]:prose-label-highlight data-[state=selected]:text-fg',
      '[&:has([role=checkbox])]:pr-0 first:pl-0 last:pr-0',
      className
    )}
    {...props}
  >
    <span className="inline-flex items-center gap-1">{children}</span>
  </th>
))
TableHead.displayName = 'TableHead'

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'p-4 align-middle',
      'font-sans text-xs',
      'text-fg-secondary prose-table',
      '[&:has([role=checkbox])]:pr-0 first:pl-0 last:pr-0',
      className
    )}
    {...props}
  />
))
TableCell.displayName = 'TableCell'

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn(
      'mt-4',
      'font-mono  text-fg-secondary',
      'opacity-70',
      className
    )}
    {...props}
  />
))
TableCaption.displayName = 'TableCaption'

interface TableEmptyStateProps {
  colSpan: number
  children: React.ReactNode
  className?: string
}

const EMPTY_STATE_ROWS = Array.from({ length: 3 })

const TableEmptyState = ({
  colSpan,
  children,
  className,
}: TableEmptyStateProps) => (
  <TableRow>
    <TableCell className="p-0" colSpan={colSpan}>
      <div
        className={cn(
          'w-full gap-2 relative flex flex-col justify-center items-center',
          className
        )}
      >
        {EMPTY_STATE_ROWS.map((_, index) => (
          <div
            key={index}
            className="h-11 w-full border border-bg-highlight relative flex items-center gap-2 justify-center overflow-hidden"
          >
            <TableEmptyRowBorder className="absolute bottom-0 left-0 rotate-180 opacity-99" />
            <TableEmptyRowBorder className="absolute bottom-0 right-0 opacity-99" />
            {index === 1 ? (
              <div className="text-fg-secondary prose-body flex items-center justify-center gap-2 px-2 text-center">
                {children}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </TableCell>
  </TableRow>
)

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmptyState,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
}
