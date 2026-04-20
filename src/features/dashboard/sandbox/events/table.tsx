'use client'

import {
  type CellContext,
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { Braces } from 'lucide-react'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import type { SandboxEventModel } from '@/core/modules/sandboxes/models'
import { useColumnSizeVars } from '@/lib/hooks/use-column-size-vars'
import { formatLocalLogStyleTimestamp } from '@/lib/utils/formatting'
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/ui/data-table'
import { JsonPopover } from '@/ui/json-popover'
import { Badge, type BadgeProps } from '@/ui/primitives/badge'

const sandboxEventDataSchema = z.record(z.string(), z.unknown())

const EVENT_TYPE_LABELS: Record<string, string> = {
  'sandbox.lifecycle.created': 'Created',
  'sandbox.lifecycle.updated': 'Updated',
  'sandbox.lifecycle.paused': 'Paused',
  'sandbox.lifecycle.resumed': 'Resumed',
  'sandbox.lifecycle.killed': 'Killed',
}

const EVENT_TYPE_VARIANTS: Record<
  string,
  NonNullable<BadgeProps['variant']>
> = {
  'sandbox.lifecycle.created': 'positive',
  'sandbox.lifecycle.updated': 'main',
  'sandbox.lifecycle.paused': 'warning',
  'sandbox.lifecycle.resumed': 'info',
  'sandbox.lifecycle.killed': 'error',
}

interface SandboxEventsTableProps {
  events: SandboxEventModel[]
}

export const SandboxEventsTable = ({ events }: SandboxEventsTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'timestamp', desc: true },
  ])

  const table = useReactTable<SandboxEventModel>({
    data: events,
    columns: EVENT_COLUMNS,
    state: { sorting },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableSortingRemoval: false,
    enableMultiSort: false,
    onSortingChange: setSorting,
  })

  const columnSizeVars = useColumnSizeVars(table)

  return (
    <div className="bg-bg min-h-0 flex-1 overflow-x-auto">
      <DataTable
        className="h-full min-w-[980px] overflow-y-auto"
        style={{ ...columnSizeVars }}
      >
        <DataTableHeader className="bg-bg sticky top-0 z-10 shadow-xs">
          {table.getHeaderGroups().map((headerGroup) => (
            <DataTableRow key={headerGroup.id} className="border-b-0">
              {headerGroup.headers.map((header) => (
                <DataTableHead
                  key={header.id}
                  header={header}
                  sorting={sorting.find((item) => item.id === header.id)?.desc}
                >
                  <span>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </span>
                </DataTableHead>
              ))}
            </DataTableRow>
          ))}
        </DataTableHeader>

        <DataTableBody>
          {table.getRowModel().rows.map((row) => (
            <DataTableRow key={row.id} className="min-h-11 items-stretch">
              {row.getVisibleCells().map((cell) => (
                <DataTableCell
                  key={cell.id}
                  cell={cell}
                  className="min-h-11 items-stretch py-2"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </DataTableCell>
              ))}
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </div>
  )
}

const TimestampCell = ({ row }: CellContext<SandboxEventModel, unknown>) => {
  const formattedTimestamp = useMemo(
    () =>
      formatLocalLogStyleTimestamp(row.original.timestamp, {
        includeYear: true,
      }),
    [row.original.timestamp]
  )

  return (
    <div className="min-h-7 whitespace-nowrap font-mono prose-table-numeric">
      <span className="text-fg-tertiary">
        {formattedTimestamp?.datePart ?? '--'}
      </span>{' '}
      {formattedTimestamp?.timePart ?? '--'}{' '}
      <span className="text-fg-tertiary">
        {formattedTimestamp?.timezonePart ?? ''}
      </span>
    </div>
  )
}

const EventTypeCell = ({ row }: CellContext<SandboxEventModel, unknown>) => {
  const label = EVENT_TYPE_LABELS[row.original.type] ?? row.original.type
  const variant = EVENT_TYPE_VARIANTS[row.original.type] ?? 'default'

  return (
    <div className="flex min-h-7 min-w-0 flex-col justify-center gap-1">
      <Badge variant={variant} size="sm" className="w-fit uppercase">
        {label}
      </Badge>
      <span className="truncate font-mono text-[11px] text-fg-tertiary">
        {row.original.type}
      </span>
    </div>
  )
}

const EventDetailsCell = ({ row }: CellContext<SandboxEventModel, unknown>) => {
  const parsedEventData = useMemo(
    () => sandboxEventDataSchema.safeParse(row.original.eventData),
    [row.original.eventData]
  )

  if (!parsedEventData.success) {
    return <span className="block w-full truncate text-fg-tertiary">n/a</span>
  }

  const entries = Object.entries(parsedEventData.data)
  if (entries.length === 0) {
    return <span className="block w-full truncate text-fg-tertiary">n/a</span>
  }

  const preview = JSON.stringify(parsedEventData.data)

  return (
    <JsonPopover
      className="text-fg-tertiary hover:text-fg min-w-0 justify-start hover:underline"
      json={parsedEventData.data}
      buttonProps={{
        className: 'w-full justify-start',
      }}
    >
      <Braces className="size-3.5" />
      <span className="block min-w-0 truncate font-mono normal-case">
        {preview}
      </span>
    </JsonPopover>
  )
}

const EventIdCell = ({ row }: CellContext<SandboxEventModel, unknown>) => {
  return (
    <div className="min-h-7 select-all overflow-hidden whitespace-nowrap font-mono text-fg-tertiary prose-table-numeric">
      {row.original.id}
    </div>
  )
}

const EVENT_COLUMNS: ColumnDef<SandboxEventModel>[] = [
  {
    accessorKey: 'timestamp',
    header: 'Timestamp',
    cell: TimestampCell,
    size: 250,
    minSize: 220,
    sortingFn: (rowA, rowB) =>
      rowA.original.timestamp.localeCompare(rowB.original.timestamp),
    sortDescFirst: true,
  },
  {
    accessorKey: 'type',
    header: 'Event',
    cell: EventTypeCell,
    size: 260,
    minSize: 220,
    enableSorting: false,
  },
  {
    id: 'details',
    header: 'Details',
    cell: EventDetailsCell,
    size: 320,
    minSize: 220,
    maxSize: 420,
    enableSorting: false,
  },
  {
    accessorKey: 'id',
    header: 'ID',
    cell: EventIdCell,
    size: 230,
    minSize: 190,
    maxSize: 260,
    enableSorting: false,
  },
]
