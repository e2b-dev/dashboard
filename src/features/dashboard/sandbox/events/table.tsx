'use client'

import {
  useVirtualizer,
  type VirtualItem,
  type Virtualizer,
} from '@tanstack/react-virtual'
import { useMemo } from 'react'
import type { SandboxEventModel } from '@/core/modules/sandboxes/models'
import {
  VirtualizedTableEmptyState,
  VirtualizedTableLoaderBody,
  VirtualizedTableRow,
} from '@/features/dashboard/common/virtualized-table-ui'
import { IdBadge } from '@/features/dashboard/shared'
import { useTimezone } from '@/features/dashboard/timezone'
import { formatLocalLogStyleTimestamp } from '@/lib/utils/formatting'
import CopyButtonInline from '@/ui/copy-button-inline'
import { JsonPopover } from '@/ui/json-popover'
import { Button } from '@/ui/primitives/button'
import { ArrowDownIcon, HistoryIcon } from '@/ui/primitives/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'
import { SandboxEventTypeBadge } from './event-type-badge'

const ROW_HEIGHT_PX = 32
const VIRTUAL_OVERSCAN = 16

interface SandboxEventsTableProps {
  events: SandboxEventModel[]
  isLoading: boolean
  scrollContainer: HTMLDivElement | null
  isTimestampDescending: boolean
  onToggleTimestampSort: () => void
}

export const SandboxEventsTable = ({
  events,
  isLoading,
  scrollContainer,
  isTimestampDescending,
  onToggleTimestampSort,
}: SandboxEventsTableProps) => {
  'use no memo'

  return (
    <Table className="grid min-w-[560px]">
      <TableHeader className="grid sticky top-0 z-1 bg-bg">
        <TableRow className="flex min-w-full">
          <TableHead
            className="flex w-[174px] px-0 h-min pb-3 pr-4 text-fg"
            data-state="selected"
          >
            <Button
              type="button"
              variant="quaternary"
              size="none"
              className="prose-label-highlight text-fg uppercase [&_svg]:size-3 [&_svg]:text-fg"
              onClick={onToggleTimestampSort}
            >
              Timestamp
              <ArrowDownIcon
                className={
                  isTimestampDescending ? 'size-3' : 'size-3 rotate-180'
                }
              />
            </Button>
          </TableHead>
          <TableHead className="flex w-[120px] px-0 h-min pb-3 pr-4">
            ID
          </TableHead>
          <TableHead className="flex w-[112px] px-0 h-min pb-3">
            Event
          </TableHead>
          <TableHead className="flex flex-1 px-0 h-min pb-3">Data</TableHead>
        </TableRow>
      </TableHeader>

      {isLoading ? (
        <VirtualizedTableLoaderBody />
      ) : events.length > 0 ? (
        <VirtualizedEventsBody
          key={`${events.length}-${scrollContainer ? 'ready' : 'pending'}`}
          events={events}
          scrollContainer={scrollContainer}
        />
      ) : (
        <VirtualizedTableEmptyState>
          <HistoryIcon className="size-5" />
          No events found
        </VirtualizedTableEmptyState>
      )}
    </Table>
  )
}

interface VirtualizedEventsBodyProps {
  events: SandboxEventModel[]
  scrollContainer: HTMLDivElement | null
}

const VirtualizedEventsBody = ({
  events,
  scrollContainer,
}: VirtualizedEventsBodyProps) => {
  'use no memo'

  const initialRect = useMemo(() => {
    if (!scrollContainer) return undefined

    return {
      height: scrollContainer.clientHeight,
      width: scrollContainer.clientWidth,
    }
  }, [scrollContainer])

  const virtualizer = useVirtualizer({
    count: events.length,
    estimateSize: () => ROW_HEIGHT_PX,
    getScrollElement: () => scrollContainer,
    initialRect,
    overscan: VIRTUAL_OVERSCAN,
    paddingStart: 8,
  })

  return (
    <TableBody
      className="grid relative min-w-full [&_tr:last-child]:border-b-0 [&_tr]:border-b-0"
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const event = events[virtualRow.index]
        if (!event) return null

        return (
          <SandboxEventRow
            key={virtualRow.key}
            event={event}
            virtualRow={virtualRow}
            virtualizer={virtualizer}
          />
        )
      })}
    </TableBody>
  )
}

interface SandboxEventRowProps {
  event: SandboxEventModel
  virtualRow: VirtualItem
  virtualizer: Virtualizer<HTMLDivElement, Element>
}

const SandboxEventRow = ({
  event,
  virtualRow,
  virtualizer,
}: SandboxEventRowProps) => {
  const { timezone } = useTimezone()
  const formattedTimestamp = formatLocalLogStyleTimestamp(event.timestamp, {
    includeCentiseconds: true,
    timeZone: timezone,
  })
  const eventDataValue = useMemo(
    () => JSON.stringify(event.eventData ?? {}),
    [event.eventData]
  )

  return (
    <VirtualizedTableRow
      virtualRow={virtualRow}
      virtualizer={virtualizer}
      height={ROW_HEIGHT_PX}
    >
      <TableCell className="flex w-[174px] items-center px-0 py-0 pr-4">
        {formattedTimestamp ? (
          <CopyButtonInline
            value={formattedTimestamp.iso}
            className="inline-flex h-[18px] items-center font-mono leading-none group prose-table-numeric truncate"
          >
            <span className="text-fg-tertiary">
              {formattedTimestamp.datePart}
            </span>{' '}
            <span>
              {formattedTimestamp.timePart}.{formattedTimestamp.subsecondPart}
            </span>
          </CopyButtonInline>
        ) : (
          <div className="inline-flex h-[18px] items-center whitespace-nowrap font-mono leading-none prose-table-numeric">
            --
          </div>
        )}
      </TableCell>
      <TableCell className="flex w-[120px] items-center px-0 py-0 pr-4">
        <IdBadge id={event.id} />
      </TableCell>
      <TableCell className="flex w-[112px] items-center px-0 py-0 pr-4">
        <SandboxEventTypeBadge type={event.type} />
      </TableCell>
      <TableCell className="flex flex-1 min-w-0 items-center overflow-hidden px-0 py-0">
        {!event.eventData || eventDataValue.trim() === '{}' ? (
          <span className="text-fg-tertiary block w-full max-w-[220px] truncate">
            n/a
          </span>
        ) : (
          <JsonPopover
            className="text-fg-tertiary hover:text-fg hover:underline justify-start text-left min-w-0 w-full max-w-[220px] normal-case"
            json={event.eventData}
          >
            <span className="block w-full truncate text-left">
              {eventDataValue}
            </span>
          </JsonPopover>
        )}
      </TableCell>
    </VirtualizedTableRow>
  )
}
