'use client'

import type { BuildLogDTO } from '@/server/api/models/builds.models'
import { useTRPC } from '@/trpc/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  useVirtualizer,
  VirtualItem,
  Virtualizer,
} from '@tanstack/react-virtual'
import { RefObject, use, useEffect, useMemo, useReducer, useRef } from 'react'
import { LogLevel, Message, Timestamp } from './logs-cells'

const COLUMN_WIDTHS_PX = {
  timestamp: 164,
  level: 92,
} as const

const ROW_HEIGHT_PX = 32
const VIRTUAL_OVERSCAN = 16

interface LogsProps {
  params: PageProps<'/dashboard/[teamIdOrSlug]/templates/[templateId]/builds/[buildId]'>['params']
}

export default function Logs({ params }: LogsProps) {
  'use no memo'

  const { teamIdOrSlug, templateId, buildId } = use(params)
  const trpc = useTRPC()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { data: buildDetails } = useSuspenseQuery(
    trpc.builds.buildDetails.queryOptions({
      teamIdOrSlug,
      templateId,
      buildId,
    })
  )

  const logs = useMemo(() => buildDetails?.logs ?? [], [buildDetails?.logs])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden relative">
      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto">
        <Table style={{ display: 'grid', minWidth: 'min-content' }}>
          <TableHeader
            className="bg-bg"
            style={{ display: 'grid', position: 'sticky', top: 0, zIndex: 1 }}
          >
            <TableRow
              style={{
                display: 'flex',
                minWidth: '100%',
              }}
            >
              <TableHead
                style={{ display: 'flex', width: COLUMN_WIDTHS_PX.timestamp }}
              >
                Timestamp
              </TableHead>
              <TableHead
                style={{ display: 'flex', width: COLUMN_WIDTHS_PX.level }}
              >
                Level
              </TableHead>
              <TableHead style={{ display: 'flex', flex: 1 }}>
                Message
              </TableHead>
            </TableRow>
          </TableHeader>

          <LogsTableBody logs={logs} scrollContainerRef={scrollContainerRef} />
        </Table>
      </div>
    </div>
  )
}

interface LogsTableBodyProps {
  logs: BuildLogDTO[]
  scrollContainerRef: RefObject<HTMLDivElement | null>
}

const rerenderReducer = () => ({})

function LogsTableBody({ logs, scrollContainerRef }: LogsTableBodyProps) {
  'use no memo'

  const tbodyRef = useRef<HTMLTableSectionElement>(null)
  const maxWidthRef = useRef<number>(0)
  const [, rerender] = useReducer(rerenderReducer, 0)

  // force rerender after mount so virtualizer can access the scroll container
  useEffect(() => {
    if (scrollContainerRef.current) {
      rerender()
    }
  }, [scrollContainerRef])

  const rowVirtualizer = useVirtualizer({
    count: logs.length,
    estimateSize: () => ROW_HEIGHT_PX,
    getScrollElement: () => scrollContainerRef.current,
    overscan: VIRTUAL_OVERSCAN,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  // measure tbody scrollWidth after render and track max width seen
  const currentScrollWidth = tbodyRef.current?.scrollWidth ?? 0
  if (currentScrollWidth > maxWidthRef.current) {
    maxWidthRef.current = currentScrollWidth
  }

  return (
    <TableBody
      ref={tbodyRef}
      style={{
        display: 'grid',
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: maxWidthRef.current,
        minWidth: '100%',
        position: 'relative',
      }}
    >
      {virtualItems.map((virtualRow) => {
        const log = logs[virtualRow.index]!
        return (
          <LogsTableRow
            key={virtualRow.index}
            log={log}
            virtualRow={virtualRow}
            rowVirtualizer={rowVirtualizer}
          />
        )
      })}
    </TableBody>
  )
}

interface LogsTableRowProps {
  log: BuildLogDTO
  virtualRow: VirtualItem
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>
}

function LogsTableRow({ log, virtualRow, rowVirtualizer }: LogsTableRowProps) {
  return (
    <TableRow
      data-index={virtualRow.index}
      ref={(node) => rowVirtualizer.measureElement(node)}
      style={{
        display: 'flex',
        position: 'absolute',
        left: 0,
        transform: `translateY(${virtualRow.start}px)`,
        minWidth: '100%',
        height: ROW_HEIGHT_PX,
      }}
    >
      <TableCell
        className="py-0"
        style={{
          display: 'flex',
          alignItems: 'center',
          width: COLUMN_WIDTHS_PX.timestamp,
        }}
      >
        <Timestamp
          timestampUnix={log.timestampUnix}
          millisAfterCreatedAt={log.millisAfterCreatedAt}
        />
      </TableCell>
      <TableCell
        className="py-0"
        style={{
          display: 'flex',
          alignItems: 'center',
          width: COLUMN_WIDTHS_PX.level,
        }}
      >
        <LogLevel level={log.level} />
      </TableCell>
      <TableCell
        className="py-0"
        style={{
          display: 'flex',
          alignItems: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        <Message message={log.message} />
      </TableCell>
    </TableRow>
  )
}
