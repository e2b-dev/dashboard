'use client'

import type { SandboxLogDTO } from '@/server/api/models/sandboxes.models'
import { ArrowDownIcon, ListIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'
import {
  useVirtualizer,
  VirtualItem,
  Virtualizer,
} from '@tanstack/react-virtual'
import { RefObject, useCallback, useEffect, useReducer, useRef } from 'react'
import { useSandboxContext } from '../context'
import { LogLevel, Message, Timestamp } from './logs-cells'
import { useSandboxLogs } from './use-sandbox-logs'

// column widths are calculated as max width of the content + padding
const COLUMN_WIDTHS_PX = { timestamp: 176 + 16, level: 52 + 16 } as const
const ROW_HEIGHT_PX = 26
const VIRTUAL_OVERSCAN = 16
const SCROLL_LOAD_THRESHOLD_PX = 200

interface LogsProps {
  teamIdOrSlug: string
  sandboxId: string
}

export default function SandboxLogs({ teamIdOrSlug, sandboxId }: LogsProps) {
  'use no memo'

  const { sandboxInfo, isRunning } = useSandboxContext()

  if (!sandboxInfo) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden relative gap-3">
        <div className="min-h-0 flex-1 overflow-auto">
          <Table style={{ display: 'grid', minWidth: 'min-content' }}>
            <LogsTableHeader />
            <LoaderBody />
          </Table>
        </div>
      </div>
    )
  }

  return (
    <LogsContent
      teamIdOrSlug={teamIdOrSlug}
      sandboxId={sandboxId}
      isRunning={isRunning}
    />
  )
}

interface LogsContentProps {
  teamIdOrSlug: string
  sandboxId: string
  isRunning: boolean
}

function LogsContent({ teamIdOrSlug, sandboxId, isRunning }: LogsContentProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const {
    logs,
    isInitialized,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    fetchNextPage,
  } = useSandboxLogs({
    teamIdOrSlug,
    sandboxId,
    isRunning,
  })

  const hasLogs = logs.length > 0
  const showLoader = isFetching && !hasLogs
  const showEmpty = !isFetching && !hasLogs

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden relative gap-3">
      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto">
        <Table style={{ display: 'grid', minWidth: 'min-content' }}>
          <LogsTableHeader />

          {showLoader && <LoaderBody />}
          {showEmpty && <EmptyBody />}
          {hasLogs && (
            <VirtualizedLogsBody
              logs={logs}
              scrollContainerRef={scrollContainerRef}
              onLoadMore={handleLoadMore}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              isInitialized={isInitialized}
              isRunning={isRunning}
            />
          )}
        </Table>
      </div>
    </div>
  )
}

function LogsTableHeader() {
  return (
    <TableHeader
      className="bg-bg"
      style={{ display: 'grid', position: 'sticky', top: 0, zIndex: 1 }}
    >
      <TableRow style={{ display: 'flex', minWidth: '100%' }}>
        <TableHead
          data-state="selected"
          className="px-0 pr-4"
          style={{ display: 'flex', width: COLUMN_WIDTHS_PX.timestamp }}
        >
          Timestamp <ArrowDownIcon className="size-3 rotate-180" />
        </TableHead>
        <TableHead
          className="px-0 pr-4"
          style={{ display: 'flex', width: COLUMN_WIDTHS_PX.level }}
        >
          Level
        </TableHead>
        <TableHead className="px-0" style={{ display: 'flex', flex: 1 }}>
          Message
        </TableHead>
      </TableRow>
    </TableHeader>
  )
}

function LoaderBody() {
  return (
    <TableBody style={{ display: 'grid' }}>
      <TableRow style={{ display: 'flex', minWidth: '100%', marginTop: 8 }}>
        <TableCell className="flex-1">
          <div className="h-[35svh] w-full flex justify-center items-center">
            <Loader variant="slash" size="lg" />
          </div>
        </TableCell>
      </TableRow>
    </TableBody>
  )
}

function EmptyBody() {
  return (
    <TableBody style={{ display: 'grid' }}>
      <TableRow style={{ display: 'flex', minWidth: '100%', marginTop: 8 }}>
        <TableCell className="flex-1">
          <div className="h-[35vh] w-full gap-2 relative flex flex-col justify-center items-center p-6">
            <div className="flex items-center gap-2">
              <ListIcon className="size-5" />
              <p className="prose-body-highlight">No logs found</p>
            </div>
            <p className="text-fg-tertiary text-sm">
              Sandbox logs will appear here once available.
            </p>
          </div>
        </TableCell>
      </TableRow>
    </TableBody>
  )
}

interface VirtualizedLogsBodyProps {
  logs: SandboxLogDTO[]
  scrollContainerRef: RefObject<HTMLDivElement | null>
  onLoadMore: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isInitialized: boolean
  isRunning: boolean
}

function VirtualizedLogsBody({
  logs,
  scrollContainerRef,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
  isInitialized,
  isRunning,
}: VirtualizedLogsBodyProps) {
  const tbodyRef = useRef<HTMLTableSectionElement>(null)
  const maxWidthRef = useRef<number>(0)
  const [, forceRerender] = useReducer(() => ({}), {})

  useEffect(() => {
    if (scrollContainerRef.current) forceRerender()
  }, [scrollContainerRef])

  useScrollLoadMore({
    scrollContainerRef,
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
  })

  useAutoScrollToBottom({
    scrollContainerRef,
    logsCount: logs.length,
    isInitialized,
    isRunning,
  })

  useMaintainScrollOnPrepend({
    scrollContainerRef,
    logsCount: logs.length,
    isFetchingNextPage,
  })

  const showStatusRow = hasNextPage || isFetchingNextPage

  const virtualizer = useVirtualizer({
    count: logs.length + (showStatusRow ? 1 : 0),
    estimateSize: () => ROW_HEIGHT_PX,
    getScrollElement: () => scrollContainerRef.current,
    overscan: VIRTUAL_OVERSCAN,
    paddingStart: 8,
  })

  const containerWidth = scrollContainerRef.current?.clientWidth ?? 0
  const contentWidth = scrollContainerRef.current?.scrollWidth ?? 0
  const SCROLLBAR_BUFFER_PX = 20
  const hasHorizontalOverflow =
    contentWidth > containerWidth + SCROLLBAR_BUFFER_PX

  if (hasHorizontalOverflow && contentWidth > maxWidthRef.current) {
    maxWidthRef.current = contentWidth
  }

  return (
    <TableBody
      ref={tbodyRef}
      className="[&_tr:last-child]:border-b-0 [&_tr]:border-b-0"
      style={{
        display: 'grid',
        height: `${virtualizer.getTotalSize()}px`,
        width: hasHorizontalOverflow ? maxWidthRef.current : undefined,
        minWidth: '100%',
        position: 'relative',
      }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const isStatusRow = showStatusRow && virtualRow.index === 0

        if (isStatusRow) {
          return (
            <StatusRow
              key="status-row"
              virtualRow={virtualRow}
              virtualizer={virtualizer}
              isFetchingNextPage={isFetchingNextPage}
            />
          )
        }

        const logIndex = showStatusRow ? virtualRow.index - 1 : virtualRow.index

        return (
          <LogRow
            key={virtualRow.index}
            log={logs[logIndex]!}
            virtualRow={virtualRow}
            virtualizer={virtualizer}
          />
        )
      })}
    </TableBody>
  )
}

interface UseScrollLoadMoreParams {
  scrollContainerRef: RefObject<HTMLDivElement | null>
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
}

function useScrollLoadMore({
  scrollContainerRef,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: UseScrollLoadMoreParams) {
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      if (
        scrollContainer.scrollTop < SCROLL_LOAD_THRESHOLD_PX &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        onLoadMore()
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [scrollContainerRef, hasNextPage, isFetchingNextPage, onLoadMore])
}

interface UseMaintainScrollOnPrependParams {
  scrollContainerRef: RefObject<HTMLDivElement | null>
  logsCount: number
  isFetchingNextPage: boolean
}

function useMaintainScrollOnPrepend({
  scrollContainerRef,
  logsCount,
  isFetchingNextPage,
}: UseMaintainScrollOnPrependParams) {
  const prevLogsCountRef = useRef(logsCount)
  const wasFetchingRef = useRef(false)

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return

    const justFinishedFetching = wasFetchingRef.current && !isFetchingNextPage
    const logsWerePrepended = logsCount > prevLogsCountRef.current

    if (justFinishedFetching && logsWerePrepended) {
      const addedCount = logsCount - prevLogsCountRef.current
      el.scrollTop += addedCount * ROW_HEIGHT_PX
    }

    wasFetchingRef.current = isFetchingNextPage
    prevLogsCountRef.current = logsCount
  }, [scrollContainerRef, logsCount, isFetchingNextPage])
}

interface UseAutoScrollToBottomParams {
  scrollContainerRef: RefObject<HTMLDivElement | null>
  logsCount: number
  isInitialized: boolean
  isRunning: boolean
}

function useAutoScrollToBottom({
  scrollContainerRef,
  logsCount,
  isInitialized,
  isRunning,
}: UseAutoScrollToBottomParams) {
  const isAutoScrollEnabledRef = useRef(true)
  const prevLogsCountRef = useRef(0)
  const prevIsRunningRef = useRef(isRunning)
  const hasInitialScrolled = useRef(false)

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return

    const handleScroll = () => {
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight
      isAutoScrollEnabledRef.current = distanceFromBottom < ROW_HEIGHT_PX * 2
    }

    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [scrollContainerRef])

  useEffect(() => {
    if (isInitialized && !hasInitialScrolled.current && logsCount > 0) {
      hasInitialScrolled.current = true
      prevLogsCountRef.current = logsCount
      requestAnimationFrame(() => {
        const el = scrollContainerRef.current
        if (el) el.scrollTop = el.scrollHeight
      })
    }
  }, [isInitialized, logsCount, scrollContainerRef])

  useEffect(() => {
    if (prevIsRunningRef.current !== isRunning) {
      prevIsRunningRef.current = isRunning
      hasInitialScrolled.current = false
      prevLogsCountRef.current = 0
    }
  }, [isRunning])

  useEffect(() => {
    if (!hasInitialScrolled.current) return

    const newLogsCount = logsCount - prevLogsCountRef.current

    if (newLogsCount > 0 && isAutoScrollEnabledRef.current) {
      const el = scrollContainerRef.current
      if (el) el.scrollTop += newLogsCount * ROW_HEIGHT_PX
    }

    prevLogsCountRef.current = logsCount
  }, [logsCount, scrollContainerRef])
}

interface LogRowProps {
  log: SandboxLogDTO
  virtualRow: VirtualItem
  virtualizer: Virtualizer<HTMLDivElement, Element>
}

function LogRow({ log, virtualRow, virtualizer }: LogRowProps) {
  return (
    <TableRow
      data-index={virtualRow.index}
      ref={(node) => virtualizer.measureElement(node)}
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
        className="py-0 px-0 pr-4"
        style={{
          display: 'flex',
          alignItems: 'center',
          width: COLUMN_WIDTHS_PX.timestamp,
        }}
      >
        <Timestamp timestampUnix={log.timestampUnix} />
      </TableCell>
      <TableCell
        className="py-0 px-0 pr-4"
        style={{
          display: 'flex',
          alignItems: 'center',
          width: COLUMN_WIDTHS_PX.level,
        }}
      >
        <LogLevel level={log.level} />
      </TableCell>
      <TableCell
        className="py-0 px-0"
        style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}
      >
        <Message message={log.message} />
      </TableCell>
    </TableRow>
  )
}

interface StatusRowProps {
  virtualRow: VirtualItem
  virtualizer: Virtualizer<HTMLDivElement, Element>
  isFetchingNextPage: boolean
}

function StatusRow({
  virtualRow,
  virtualizer,
  isFetchingNextPage,
}: StatusRowProps) {
  return (
    <TableRow
      data-index={virtualRow.index}
      ref={(node) => virtualizer.measureElement(node)}
      className="animate-pulse"
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
        colSpan={3}
        className="py-0 w-full"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'start',
        }}
      >
        <span className="prose-body text-fg-tertiary pb-1">
          {isFetchingNextPage ? (
            <span className="inline-flex gap-1">
              Loading more logs
              <Loader variant="dots" />
            </span>
          ) : (
            'Scroll to load more'
          )}
        </span>
      </TableCell>
    </TableRow>
  )
}
