'use client'

import { LOG_RETENTION_MS } from '@/configs/logs'
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
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { useSandboxContext } from '../context'
import { LogLevel, Message, Timestamp } from './logs-cells'
import { useSandboxLogs } from './use-sandbox-logs'

// column widths are calculated as max width of the content + padding
const COLUMN_WIDTHS_PX = { timestamp: 148 + 16, level: 48 + 16 } as const
const ROW_HEIGHT_PX = 26
const LIVE_STATUS_ROW_HEIGHT_PX = ROW_HEIGHT_PX + 16
const VIRTUAL_OVERSCAN = 16
const SCROLL_LOAD_THRESHOLD_PX = 200
const LOG_RETENTION_DAYS = LOG_RETENTION_MS / 24 / 60 / 60 / 1000

interface LogsProps {
  teamIdOrSlug: string
  sandboxId: string
}

function checkIfSandboxStillHasLogs(startedAtIso: string) {
  const startedAtUnix = new Date(startedAtIso).getTime()

  if (Number.isNaN(startedAtUnix)) {
    return true
  }

  return Date.now() - startedAtUnix < LOG_RETENTION_MS
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

  const hasRetainedLogs = checkIfSandboxStillHasLogs(sandboxInfo.startedAt)

  return (
    <LogsContent
      teamIdOrSlug={teamIdOrSlug}
      sandboxId={sandboxId}
      isRunning={isRunning}
      hasRetainedLogs={hasRetainedLogs}
    />
  )
}

interface LogsContentProps {
  teamIdOrSlug: string
  sandboxId: string
  isRunning: boolean
  hasRetainedLogs: boolean
}

function LogsContent({
  teamIdOrSlug,
  sandboxId,
  isRunning,
  hasRetainedLogs,
}: LogsContentProps) {
  const [scrollContainerElement, setScrollContainerElement] =
    useState<HTMLDivElement | null>(null)

  const {
    logs,
    isInitialized,
    hasCompletedInitialLoad,
    initialLoadError,
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
  const showLoader = (!hasCompletedInitialLoad || isFetching) && !hasLogs
  const showEmpty = hasCompletedInitialLoad && !isFetching && !hasLogs

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden relative gap-3">
      <div
        ref={setScrollContainerElement}
        className="min-h-0 flex-1 overflow-auto"
      >
        <Table style={{ display: 'grid', minWidth: 'min-content' }}>
          <LogsTableHeader />

          {showLoader && <LoaderBody />}
          {showEmpty && (
            <EmptyBody
              hasRetainedLogs={hasRetainedLogs}
              errorMessage={initialLoadError}
            />
          )}
          {hasLogs && scrollContainerElement && (
            <VirtualizedLogsBody
              logs={logs}
              scrollContainerElement={scrollContainerElement}
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
          className="px-0 h-min pb-3 pr-4 text-fg"
          style={{ display: 'flex', width: COLUMN_WIDTHS_PX.timestamp }}
        >
          Timestamp <ArrowDownIcon className="size-3" />
        </TableHead>
        <TableHead
          className="px-0 h-min pb-3 pr-4"
          style={{ display: 'flex', width: COLUMN_WIDTHS_PX.level }}
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

interface EmptyBodyProps {
  hasRetainedLogs: boolean
  errorMessage: string | null
}

function EmptyBody({ hasRetainedLogs, errorMessage }: EmptyBodyProps) {
  return (
    <TableBody style={{ display: 'grid' }}>
      <TableRow style={{ display: 'flex', minWidth: '100%', marginTop: 8 }}>
        <TableCell className="flex-1">
          <div className="h-[35vh] w-full gap-2 relative flex flex-col justify-center items-center p-6">
            <div className="flex items-center gap-2">
              <ListIcon className="size-5" />
              <p className="prose-body-highlight">No logs found</p>
            </div>
            {errorMessage ? (
              <p className="text-fg-tertiary text-sm">{errorMessage}</p>
            ) : !hasRetainedLogs ? (
              <p className="text-fg-tertiary text-sm">
                This sandbox has exceeded the {LOG_RETENTION_DAYS} day retention
                limit.
              </p>
            ) : (
              <p className="text-fg-tertiary text-sm">
                Sandbox logs will appear here once available.
              </p>
            )}
          </div>
        </TableCell>
      </TableRow>
    </TableBody>
  )
}

interface VirtualizedLogsBodyProps {
  logs: SandboxLogDTO[]
  scrollContainerElement: HTMLDivElement
  onLoadMore: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isInitialized: boolean
  isRunning: boolean
}

function VirtualizedLogsBody({
  logs,
  scrollContainerElement,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
  isInitialized,
  isRunning,
}: VirtualizedLogsBodyProps) {
  const tbodyRef = useRef<HTMLTableSectionElement>(null)
  const maxWidthRef = useRef<number>(0)

  useScrollLoadMore({
    scrollContainerElement,
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
  })

  useMaintainScrollOnPrepend({
    scrollContainerElement,
    logsCount: logs.length,
    isFetchingNextPage,
  })

  const showLoadMoreStatusRow = hasNextPage || isFetchingNextPage
  const logsStartIndex = showLoadMoreStatusRow ? 1 : 0
  const liveStatusRowIndex = logsStartIndex + logs.length
  const virtualRowsCount = logs.length + (showLoadMoreStatusRow ? 1 : 0) + 1

  const virtualizer = useVirtualizer({
    count: virtualRowsCount,
    estimateSize: (index) =>
      index === liveStatusRowIndex ? LIVE_STATUS_ROW_HEIGHT_PX : ROW_HEIGHT_PX,
    getScrollElement: () => scrollContainerElement,
    overscan: VIRTUAL_OVERSCAN,
    paddingStart: 8,
  })

  const scrollToLatestLog = useCallback(() => {
    if (logs.length === 0) return
    virtualizer.scrollToIndex(liveStatusRowIndex, { align: 'end' })
  }, [logs.length, liveStatusRowIndex, virtualizer])

  useAutoScrollToBottom({
    scrollContainerElement,
    logsCount: logs.length,
    isFetchingNextPage,
    isInitialized,
    isRunning,
    scrollToLatestLog,
  })

  const containerWidth = scrollContainerElement.clientWidth
  const contentWidth = scrollContainerElement.scrollWidth
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
        const isLoadMoreStatusRow =
          showLoadMoreStatusRow && virtualRow.index === 0

        if (isLoadMoreStatusRow) {
          return (
            <StatusRow
              key="load-more-status-row"
              virtualRow={virtualRow}
              virtualizer={virtualizer}
              isFetchingNextPage={isFetchingNextPage}
            />
          )
        }

        const isLiveStatusRow = virtualRow.index === liveStatusRowIndex

        if (isLiveStatusRow) {
          return (
            <LiveStatusRow
              key="live-status-row"
              virtualRow={virtualRow}
              virtualizer={virtualizer}
              isRunning={isRunning}
            />
          )
        }

        const logIndex = virtualRow.index - logsStartIndex
        const log = logs[logIndex]!

        return (
          <LogRow
            key={virtualRow.key}
            log={log}
            logIndex={logIndex}
            virtualRow={virtualRow}
            virtualizer={virtualizer}
          />
        )
      })}
    </TableBody>
  )
}

interface UseScrollLoadMoreParams {
  scrollContainerElement: HTMLDivElement
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
}

function useScrollLoadMore({
  scrollContainerElement,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: UseScrollLoadMoreParams) {
  useEffect(() => {
    const handleScroll = () => {
      if (
        scrollContainerElement.scrollTop < SCROLL_LOAD_THRESHOLD_PX &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        onLoadMore()
      }
    }

    scrollContainerElement.addEventListener('scroll', handleScroll)
    return () =>
      scrollContainerElement.removeEventListener('scroll', handleScroll)
  }, [scrollContainerElement, hasNextPage, isFetchingNextPage, onLoadMore])
}

interface UseMaintainScrollOnPrependParams {
  scrollContainerElement: HTMLDivElement
  logsCount: number
  isFetchingNextPage: boolean
}

function useMaintainScrollOnPrepend({
  scrollContainerElement,
  logsCount,
  isFetchingNextPage,
}: UseMaintainScrollOnPrependParams) {
  const prevLogsCountRef = useRef(logsCount)
  const wasFetchingRef = useRef(false)

  useEffect(() => {
    const justFinishedFetching = wasFetchingRef.current && !isFetchingNextPage
    const logsWerePrepended = logsCount > prevLogsCountRef.current

    if (justFinishedFetching && logsWerePrepended) {
      const addedCount = logsCount - prevLogsCountRef.current
      scrollContainerElement.scrollTop += addedCount * ROW_HEIGHT_PX
    }

    wasFetchingRef.current = isFetchingNextPage
    prevLogsCountRef.current = logsCount
  }, [scrollContainerElement, logsCount, isFetchingNextPage])
}

interface UseAutoScrollToBottomParams {
  scrollContainerElement: HTMLDivElement
  logsCount: number
  isFetchingNextPage: boolean
  isInitialized: boolean
  isRunning: boolean
  scrollToLatestLog: () => void
}

function useAutoScrollToBottom({
  scrollContainerElement,
  logsCount,
  isFetchingNextPage,
  isInitialized,
  isRunning,
  scrollToLatestLog,
}: UseAutoScrollToBottomParams) {
  const isAutoScrollEnabledRef = useRef(true)
  const prevLogsCountRef = useRef(0)
  const prevIsRunningRef = useRef(isRunning)
  const wasFetchingNextPageRef = useRef(isFetchingNextPage)
  const hasInitialScrolled = useRef(false)

  useEffect(() => {
    const handleScroll = () => {
      const distanceFromBottom =
        scrollContainerElement.scrollHeight -
        scrollContainerElement.scrollTop -
        scrollContainerElement.clientHeight
      isAutoScrollEnabledRef.current = distanceFromBottom < ROW_HEIGHT_PX * 2
    }

    scrollContainerElement.addEventListener('scroll', handleScroll)
    return () =>
      scrollContainerElement.removeEventListener('scroll', handleScroll)
  }, [scrollContainerElement])

  useLayoutEffect(() => {
    if (isInitialized && !hasInitialScrolled.current && logsCount > 0) {
      hasInitialScrolled.current = true
      prevLogsCountRef.current = logsCount
      scrollToLatestLog()
    }
  }, [isInitialized, logsCount, scrollToLatestLog])

  useEffect(() => {
    if (prevIsRunningRef.current !== isRunning) {
      prevIsRunningRef.current = isRunning
      hasInitialScrolled.current = false
      prevLogsCountRef.current = 0
    }
  }, [isRunning])

  useEffect(() => {
    if (!hasInitialScrolled.current) {
      wasFetchingNextPageRef.current = isFetchingNextPage
      return
    }

    const previousLogsCount = prevLogsCountRef.current
    const newLogsCount = logsCount - previousLogsCount
    const justFinishedBackwardFetch =
      wasFetchingNextPageRef.current && !isFetchingNextPage

    if (justFinishedBackwardFetch && newLogsCount > 0) {
      prevLogsCountRef.current = logsCount
      wasFetchingNextPageRef.current = isFetchingNextPage
      return
    }

    if (newLogsCount > 0 && isAutoScrollEnabledRef.current) {
      scrollContainerElement.scrollTop += newLogsCount * ROW_HEIGHT_PX
    }

    prevLogsCountRef.current = logsCount
    wasFetchingNextPageRef.current = isFetchingNextPage
  }, [isFetchingNextPage, logsCount, scrollContainerElement])
}

interface LogRowProps {
  log: SandboxLogDTO
  logIndex: number
  virtualRow: VirtualItem
  virtualizer: Virtualizer<HTMLDivElement, Element>
}

function LogRow({ log, logIndex, virtualRow, virtualizer }: LogRowProps) {
  const logLevelBorderClass: Record<SandboxLogDTO['level'], string> = {
    debug: '',
    info: 'border-accent-info-highlight!',
    warn: 'border-accent-warning-highlight!',
    error: 'border-accent-error-highlight!',
  }

  return (
    <TableRow
      data-index={virtualRow.index}
      ref={(node) => virtualizer.measureElement(node)}
      className={`${logIndex % 2 === 1 ? 'bg-bg-1 ' : ''}border-l ${
        logLevelBorderClass[log.level]
      }`}
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
        className="py-0 pr-4 pl-1.5!"
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
        className="py-0 w-full pl-1.5!"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'start',
        }}
      >
        <span className="pb-1 text-fg-tertiary font-mono text-xs whitespace-nowrap inline-flex items-center gap-1 uppercase">
          {isFetchingNextPage ? (
            <>
              <span className="text-fg-secondary">[</span>
              <span className="text-accent-info-highlight">loading</span>
              <span className="text-fg-secondary">]</span>
              <span>retrieving older logs</span>
              <Loader variant="dots" size="sm" className="font-mono" />
            </>
          ) : (
            'Scroll to load more'
          )}
        </span>
      </TableCell>
    </TableRow>
  )
}

interface LiveStatusRowProps {
  virtualRow: VirtualItem
  virtualizer: Virtualizer<HTMLDivElement, Element>
  isRunning: boolean
}

function LiveStatusRow({
  virtualRow,
  virtualizer,
  isRunning,
}: LiveStatusRowProps) {
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
        height: LIVE_STATUS_ROW_HEIGHT_PX,
      }}
    >
      <TableCell
        colSpan={3}
        className="py-0 w-full pl-1.5!"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'start',
        }}
      >
        <span className="pb-1 text-fg-tertiary font-mono text-xs whitespace-nowrap inline-flex items-center gap-1 uppercase">
          <span className="text-fg-secondary">[</span>
          <span
            className={
              isRunning
                ? 'text-accent-positive-highlight'
                : 'text-accent-info-highlight'
            }
          >
            {isRunning ? 'live' : 'end'}
          </span>
          <span className="text-fg-secondary">]</span>
          <span>
            {isRunning
              ? 'No more logs to show. Waiting for new entries...'
              : 'No more logs to show'}
          </span>
        </span>
      </TableCell>
    </TableRow>
  )
}
