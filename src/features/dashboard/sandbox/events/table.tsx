'use client'

import { useMemo } from 'react'
import { z } from 'zod'
import type { SandboxEventModel } from '@/core/modules/sandboxes/models'
import { IdBadge } from '@/features/dashboard/settings/keys/id-badge'
import { formatLocalLogStyleTimestamp } from '@/lib/utils/formatting'
import CopyButtonInline from '@/ui/copy-button-inline'
import { JsonPopover } from '@/ui/json-popover'
import { ArrowDownIcon, HistoryIcon } from '@/ui/primitives/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'
import { SandboxEventTypeBadge } from './event-type-badge'

const sandboxEventDataSchema = z.record(z.string(), z.unknown())
const EVENT_COLUMN_WIDTHS = {
  // Match the compact sandbox logs timestamp width.
  timestamp: 148 + 16,
  // Sized to fit the fixed-width badge content plus cell padding.
  id: 92 + 16,
  event: 72 + 16,
} as const

const colStyle = (width: number) => ({
  width,
  minWidth: width,
  maxWidth: width,
})

interface SandboxEventsTableProps {
  events: SandboxEventModel[]
  isTimestampDescending: boolean
  onToggleTimestampSort: () => void
}

export const SandboxEventsTable = ({
  events,
  isTimestampDescending,
  onToggleTimestampSort,
}: SandboxEventsTableProps) => {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <Table className="min-w-[620px] table-fixed">
        <colgroup>
          <col style={colStyle(EVENT_COLUMN_WIDTHS.timestamp)} />
          <col style={colStyle(EVENT_COLUMN_WIDTHS.id)} />
          <col style={colStyle(EVENT_COLUMN_WIDTHS.event)} />
          <col />
        </colgroup>
        <TableHeader className="bg-bg sticky top-0 z-10 shadow-xs">
          <TableRow className="border-b-0">
            <TableHead
              className="px-0 h-min pb-3 pr-4 text-fg"
              data-state="selected"
            >
              <button
                type="button"
                className="inline-flex items-center gap-1"
                onClick={onToggleTimestampSort}
              >
                TIMESTAMP
                <ArrowDownIcon
                  className={
                    isTimestampDescending ? 'size-3' : 'size-3 rotate-180'
                  }
                />
              </button>
            </TableHead>
            <TableHead className="px-0 h-min pb-3 pr-4">ID</TableHead>
            <TableHead className="px-0 h-min pb-3 pr-4">Event</TableHead>
            <TableHead className="px-0 h-min pb-3">Details</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {events.length > 0 ? (
            events.map((event) => (
              <TableRow key={event.id} className="h-8">
                <TableCell className="px-0 py-0 pr-4">
                  <TimestampCell timestamp={event.timestamp} />
                </TableCell>
                <TableCell className="px-0 py-0 pr-4">
                  <EventIdCell id={event.id} />
                </TableCell>
                <TableCell className="px-0 py-0 pr-4">
                  <EventTypeCell type={event.type} />
                </TableCell>
                <TableCell className="px-0 py-0">
                  <EventDetailsCell eventData={event.eventData} />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <EventsEmptyState />
          )}
        </TableBody>
      </Table>
    </div>
  )
}

const EventsEmptyState = () => {
  return (
    <TableEmptyState colSpan={4}>
      <div className="flex items-center gap-2">
        <HistoryIcon className="size-5" />
        <p className="prose-body-highlight text-fg-tertiary">No events found</p>
      </div>
    </TableEmptyState>
  )
}

const TimestampCell = ({
  timestamp,
}: {
  timestamp: SandboxEventModel['timestamp']
}) => {
  const formattedTimestamp = useMemo(
    () =>
      formatLocalLogStyleTimestamp(timestamp, {
        includeCentiseconds: true,
      }),
    [timestamp]
  )

  if (!formattedTimestamp) {
    return (
      <div className="inline-flex h-[18px] items-center whitespace-nowrap font-mono leading-none prose-table-numeric">
        --
      </div>
    )
  }

  return (
    <CopyButtonInline
      value={formattedTimestamp.iso}
      className="inline-flex h-[18px] items-center font-mono leading-none group prose-table-numeric truncate"
    >
      <span className="text-fg-tertiary">{formattedTimestamp.datePart}</span>{' '}
      <span>
        {formattedTimestamp.timePart}.{formattedTimestamp.subsecondPart}
      </span>
    </CopyButtonInline>
  )
}

const EventTypeCell = ({ type }: { type: SandboxEventModel['type'] }) => {
  return (
    <div className="flex h-8 min-w-0 items-center">
      <SandboxEventTypeBadge type={type} />
    </div>
  )
}

const EventDetailsCell = ({
  eventData,
}: {
  eventData: SandboxEventModel['eventData']
}) => {
  const parsedEventData = useMemo(
    () => sandboxEventDataSchema.safeParse(eventData),
    [eventData]
  )

  if (!parsedEventData.success) {
    return <span className="block w-full truncate text-fg-tertiary">n/a</span>
  }

  const entries = Object.entries(parsedEventData.data)
  if (entries.length === 0) {
    return <span className="block w-full truncate text-fg-tertiary">n/a</span>
  }

  return <EventDetailsJsonCell json={parsedEventData.data} />
}

const EventDetailsJsonCell = ({ json }: { json: Record<string, unknown> }) => {
  const preview = JSON.stringify(json)

  return (
    <JsonPopover
      className="text-fg-tertiary hover:text-fg hover:underline min-w-0 normal-case"
      json={json}
    >
      <span className="block w-full truncate">{preview}</span>
    </JsonPopover>
  )
}

const EventIdCell = ({ id }: { id: SandboxEventModel['id'] }) => {
  return (
    <div className="flex h-8 min-w-0 items-center">
      <IdBadge id={id} />
    </div>
  )
}
