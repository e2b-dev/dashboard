'use client'

import type { SandboxEventModel } from '@/core/modules/sandboxes/models'
import { IdBadge } from '@/features/dashboard/shared'
import { formatLocalLogStyleTimestamp } from '@/lib/utils/formatting'
import CopyButtonInline from '@/ui/copy-button-inline'
import { Button } from '@/ui/primitives/button'
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
    <Table className="min-w-[360px] table-fixed">
      <colgroup>
        <col className="w-[164px]" />
        <col className="w-[108px]" />
        <col />
      </colgroup>
      <TableHeader className="bg-bg sticky top-0 z-10">
        <TableRow>
          <TableHead className="px-0 h-min text-fg" data-state="selected">
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
          <TableHead className="px-0">ID</TableHead>
          <TableHead className="px-0">Event</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {events.length > 0 ? (
          events.map((event) => {
            const formattedTimestamp = formatLocalLogStyleTimestamp(
              event.timestamp,
              {
                includeCentiseconds: true,
              }
            )

            return (
              <TableRow key={event.id} className="h-8">
                <TableCell className="px-0 py-0 pr-4">
                  {formattedTimestamp ? (
                    <CopyButtonInline
                      value={formattedTimestamp.iso}
                      className="inline-flex h-[18px] items-center font-mono leading-none group prose-table-numeric truncate"
                    >
                      <span className="text-fg-tertiary">
                        {formattedTimestamp.datePart}
                      </span>{' '}
                      <span>
                        {formattedTimestamp.timePart}.
                        {formattedTimestamp.subsecondPart}
                      </span>
                    </CopyButtonInline>
                  ) : (
                    <div className="inline-flex h-[18px] items-center whitespace-nowrap font-mono leading-none prose-table-numeric">
                      --
                    </div>
                  )}
                </TableCell>
                <TableCell className="px-0 py-0">
                  <IdBadge id={event.id} />
                </TableCell>
                <TableCell className="px-0 py-0">
                  <SandboxEventTypeBadge type={event.type} />
                </TableCell>
              </TableRow>
            )
          })
        ) : (
          <TableEmptyState colSpan={3}>
            <HistoryIcon className="size-5" />
            No events found
          </TableEmptyState>
        )}
      </TableBody>
    </Table>
  )
}
