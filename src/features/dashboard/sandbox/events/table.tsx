'use client'

import {
  type CellContext,
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import type { SandboxEventModel } from '@/core/modules/sandboxes/models'
import { useColumnSizeVars } from '@/lib/hooks/use-column-size-vars'
import { formatLocalLogStyleTimestamp } from '@/lib/utils/formatting'
import CopyButtonInline from '@/ui/copy-button-inline'
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
import { ArrowDownIcon, HistoryIcon, MetadataIcon } from '@/ui/primitives/icons'

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
  const isTimestampDescending = sorting[0]?.desc ?? true
  const sortedEvents = useMemo(
    () =>
      [...events].sort((eventA, eventB) =>
        isTimestampDescending
          ? eventB.timestamp.localeCompare(eventA.timestamp)
          : eventA.timestamp.localeCompare(eventB.timestamp)
      ),
    [events, isTimestampDescending]
  )

  const table = useReactTable<SandboxEventModel>({
    data: sortedEvents,
    columns: EVENT_COLUMNS,
    getCoreRowModel: getCoreRowModel(),
  })

  const columnSizeVars = useColumnSizeVars(table)
  const rows = table.getRowModel().rows

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <DataTable className="min-w-[980px]" style={{ ...columnSizeVars }}>
        <DataTableHeader className="bg-bg sticky top-0 z-10 shadow-xs">
          {table.getHeaderGroups().map((headerGroup) => (
            <DataTableRow key={headerGroup.id} className="border-b-0">
              {headerGroup.headers.map((header) => (
                <DataTableHead
                  key={header.id}
                  header={header}
                  sorting={
                    header.id === 'timestamp'
                      ? isTimestampDescending
                      : undefined
                  }
                >
                  {header.isPlaceholder ? null : header.id === 'timestamp' ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() =>
                        setSorting([
                          { id: 'timestamp', desc: !isTimestampDescending },
                        ])
                      }
                    >
                      <span>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </span>
                      <ArrowDownIcon
                        className={
                          isTimestampDescending ? 'size-3' : 'size-3 rotate-180'
                        }
                      />
                    </button>
                  ) : (
                    <span>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </span>
                  )}
                </DataTableHead>
              ))}
            </DataTableRow>
          ))}
        </DataTableHeader>

        <DataTableBody>
          {rows.length > 0 ? (
            rows.map((row) => (
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
            ))
          ) : (
            <EventsEmptyState />
          )}
        </DataTableBody>
      </DataTable>
    </div>
  )
}

const EventsEmptyState = () => {
  return (
    <div className="flex h-[35svh] w-full min-w-[980px] flex-col items-center justify-center gap-2 p-6">
      <div className="flex items-center gap-2">
        <HistoryIcon className="size-5" />
        <p className="prose-body-highlight">No events found</p>
      </div>
      <p className="text-fg-tertiary text-sm">
        Lifecycle events for this sandbox will appear here once available.
      </p>
    </div>
  )
}

const TimestampCell = ({ row }: CellContext<SandboxEventModel, unknown>) => {
  const formattedTimestamp = useMemo(
    () =>
      formatLocalLogStyleTimestamp(row.original.timestamp, {
        includeCentiseconds: true,
      }),
    [row.original.timestamp]
  )

  if (!formattedTimestamp) {
    return (
      <div className="min-h-7 whitespace-nowrap font-mono prose-table-numeric">
        --
      </div>
    )
  }

  return (
    <CopyButtonInline
      value={formattedTimestamp.iso}
      className="min-h-7 font-mono group prose-table-numeric truncate"
    >
      <span className="text-fg-tertiary">{formattedTimestamp.datePart}</span>{' '}
      {formattedTimestamp.timePart}.{formattedTimestamp.subsecondPart}
    </CopyButtonInline>
  )
}

const EventTypeCell = ({ row }: CellContext<SandboxEventModel, unknown>) => {
  const label = EVENT_TYPE_LABELS[row.original.type] ?? row.original.type
  const variant = EVENT_TYPE_VARIANTS[row.original.type] ?? 'default'

  return (
    <div className="flex min-h-7 min-w-0 items-center">
      <Badge variant={variant} size="sm" className="w-fit uppercase">
        {label}
      </Badge>
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
      <MetadataIcon className="size-3.5" />
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
    header: 'TIMESTAMP',
    cell: TimestampCell,
    size: 250,
    minSize: 220,
    enableSorting: false,
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
