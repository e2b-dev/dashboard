'use client'

import {
  useVirtualizer,
  type VirtualItem,
  type Virtualizer,
} from '@tanstack/react-virtual'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { LOG_RETENTION_MS } from '@/configs/logs'
import {
  LOG_LEVEL_LEFT_BORDER_CLASS,
  type LogLevelValue,
} from '@/features/dashboard/common/log-cells'
import { LogLevelFilter } from '@/features/dashboard/common/log-level-filter'
import {
  LogStatusCell,
  LogsEmptyBody,
  LogsLoaderBody,
  LogsTableHeader,
  LogVirtualRow,
} from '@/features/dashboard/common/log-viewer-ui'
import { cn } from '@/lib/utils'
import type { SandboxLogDTO } from '@/server/api/models/sandboxes.models'
import { DebouncedInput } from '@/ui/primitives/input'
import { Loader } from '@/ui/primitives/loader'
import { Table, TableBody, TableCell } from '@/ui/primitives/table'
import { useSandboxContext } from '../context'
import { LogLevel, Message, Timestamp } from './logs-cells'
import type { LogLevelFilter as SandboxLogLevelFilter } from './logs-filter-params'
import useLogFilters from './use-log-filters'
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
  const { level, setLevel, search, setSearch } = useLogFilters()

  if (!sandboxInfo) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden relative gap-3 md:gap-6">
        <FiltersRow
          level={level}
          onLevelChange={setLevel}
          search={search}
          onSearchChange={setSearch}
        />
        <div className="min-h-0 flex-1 overflow-auto">
          <Table style={{ display: 'grid', minWidth: 'min-content' }}>
            <LogsTableHeader
              timestampWidth={COLUMN_WIDTHS_PX.timestamp}
              levelWidth={COLUMN_WIDTHS_PX.level}
              timestampSortDirection="asc"
            />
            <LogsLoaderBody />
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
      level={level}
      search={search}
      setLevel={setLevel}
      setSearch={setSearch}
    />
  )
}

interface LogsContentProps {
  teamIdOrSlug: string
  sandboxId: string
  isRunning: boolean
  hasRetainedLogs: boolean
  level: SandboxLogLevelFilter | null
  search: string
  setLevel: (level: SandboxLogLevelFilter | null) => void
  setSearch: (search: string) => void
}

function LogsContent({
  teamIdOrSlug,
  sandboxId,
  isRunning,
  hasRetainedLogs,
  level,
  search,
  setLevel,
  setSearch,
}: LogsContentProps) {
  const [scrollContainerElement, setScrollContainerElement] =
    useState<HTMLDivElement | null>(null)
  const [lastNonEmptyLogs, setLastNonEmptyLogs] = useState<SandboxLogDTO[]>([])

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
    level,
    search,
  })
  const { isRefetchingFromFilterChange, onFetchComplete } =
    useFilterRefetchTracking(level, search)

  useEffect(() => {
    if (!isFetching && isRefetchingFromFilterChange) {
      onFetchComplete()
    }
  }, [isFetching, isRefetchingFromFilterChange, onFetchComplete])

  useEffect(() => {
    if (logs.length > 0) {
      setLastNonEmptyLogs(logs)
    }
  }, [logs])

  const renderedLogs =
    logs.length > 0
      ? logs
      : isRefetchingFromFilterChange
        ? lastNonEmptyLogs
        : []
  const hasLogs = renderedLogs.length > 0
  const showLoader = (!hasCompletedInitialLoad || isFetching) && !hasLogs
  const showEmpty =
    hasCompletedInitialLoad &&
    !isFetching &&
    !hasLogs &&
    !isRefetchingFromFilterChange
  const showRefetchOverlay = isRefetchingFromFilterChange && hasLogs

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden relative gap-3 md:gap-6">
      <FiltersRow
        level={level}
        onLevelChange={setLevel}
        search={search}
        onSearchChange={setSearch}
      />
      <div
        ref={setScrollContainerElement}
        className="min-h-0 flex-1 overflow-auto"
      >
        <Table style={{ display: 'grid', minWidth: 'min-content' }}>
          <LogsTableHeader
            timestampWidth={COLUMN_WIDTHS_PX.timestamp}
            levelWidth={COLUMN_WIDTHS_PX.level}
            timestampSortDirection="asc"
          />

          {showLoader && <LogsLoaderBody />}
          {showEmpty && (
            <EmptyBody
              hasRetainedLogs={hasRetainedLogs}
              errorMessage={initialLoadError}
            />
          )}
          {hasLogs && scrollContainerElement && (
            <VirtualizedLogsBody
              logs={renderedLogs}
              scrollContainerElement={scrollContainerElement}
              onLoadMore={handleLoadMore}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              isInitialized={isInitialized}
              isRunning={isRunning}
              showRefetchOverlay={showRefetchOverlay}
              level={level}
              search={search}
            />
          )}
        </Table>
      </div>
    </div>
  )
}

function useFilterRefetchTracking(
  level: SandboxLogLevelFilter | null,
  search: string
) {
  const [isRefetchingFromFilterChange, setIsRefetching] = useState(false)
  const isInitialRender = useRef(true)
  const previousLevelRef = useRef<SandboxLogLevelFilter | null>(level)
  const previousSearchRef = useRef(search)

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      previousLevelRef.current = level
      previousSearchRef.current = search
      return
    }

    const levelChanged = previousLevelRef.current !== level
    const searchChanged = previousSearchRef.current !== search

    if (levelChanged || searchChanged) {
      previousLevelRef.current = level
      previousSearchRef.current = search
      setIsRefetching(true)
    }
  }, [level, search])

  const onFetchComplete = useCallback(() => setIsRefetching(false), [])

  return { isRefetchingFromFilterChange, onFetchComplete }
}

interface EmptyBodyProps {
  hasRetainedLogs: boolean
  errorMessage: string | null
}

function EmptyBody({ hasRetainedLogs, errorMessage }: EmptyBodyProps) {
  const description = errorMessage
    ? errorMessage
    : !hasRetainedLogs
      ? `This sandbox has exceeded the ${LOG_RETENTION_DAYS} day retention limit.`
      : 'Sandbox logs will appear here once available.'

  return <LogsEmptyBody description={description} />
}

interface FiltersRowProps {
  level: SandboxLogLevelFilter | null
  onLevelChange: (level: SandboxLogLevelFilter | null) => void
  search: string
  onSearchChange: (search: string) => void
}

function FiltersRow({
  level,
  onLevelChange,
  search,
  onSearchChange,
}: FiltersRowProps) {
  return (
    <div className="flex w-full min-h-0 items-center gap-3">
      <LogLevelFilter
        className="w-auto shrink-0"
        level={level}
        onLevelChange={onLevelChange}
        renderOption={(optionLevel) => <LogLevel level={optionLevel} />}
      />
      <DebouncedInput
        value={search}
        onChange={(value) => onSearchChange(String(value))}
        placeholder="Filter log message..."
        maxLength={256}
        className="h-9 max-w-sm"
      />
    </div>
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
  showRefetchOverlay: boolean
  level: SandboxLogLevelFilter | null
  search: string
}

function VirtualizedLogsBody({
  logs,
  scrollContainerElement,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
  isInitialized,
  isRunning,
  showRefetchOverlay,
  level,
  search,
}: VirtualizedLogsBodyProps) {
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
    level,
    search,
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
      className={cn(
        showRefetchOverlay ? 'opacity-70 transition-opacity' : '',
        '[&_tr:last-child]:border-b-0 [&_tr]:border-b-0'
      )}
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
        const log = logs[logIndex]
        if (!log) {
          return null
        }

        return (
          <LogRow
            key={virtualRow.key}
            log={log}
            search={search}
            shouldHighlight={!showRefetchOverlay}
            isZebraRow={logIndex % 2 === 1}
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

    scrollContainerElement.addEventListener('scroll', handleScroll, {
      passive: true,
    })
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
  level: SandboxLogLevelFilter | null
  search: string
  scrollToLatestLog: () => void
}

function useAutoScrollToBottom({
  scrollContainerElement,
  logsCount,
  isFetchingNextPage,
  isInitialized,
  isRunning,
  level,
  search,
  scrollToLatestLog,
}: UseAutoScrollToBottomParams) {
  const isAutoScrollEnabledRef = useRef(true)
  const prevLogsCountRef = useRef(0)
  const prevIsRunningRef = useRef(isRunning)
  const prevLevelRef = useRef(level)
  const prevSearchRef = useRef(search)
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

    scrollContainerElement.addEventListener('scroll', handleScroll, {
      passive: true,
    })
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
    if (prevLevelRef.current !== level || prevSearchRef.current !== search) {
      prevLevelRef.current = level
      prevSearchRef.current = search
      hasInitialScrolled.current = false
      prevLogsCountRef.current = 0
    }
  }, [level, search])

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
  search: string
  shouldHighlight: boolean
  isZebraRow: boolean
  virtualRow: VirtualItem
  virtualizer: Virtualizer<HTMLDivElement, Element>
}

function LogRow({
  log,
  search,
  shouldHighlight,
  isZebraRow,
  virtualRow,
  virtualizer,
}: LogRowProps) {
  return (
    <LogVirtualRow
      virtualRow={virtualRow}
      virtualizer={virtualizer}
      height={ROW_HEIGHT_PX}
      className={`${isZebraRow ? 'bg-bg-1/70 ' : ''}border-l ${
        LOG_LEVEL_LEFT_BORDER_CLASS[log.level as LogLevelValue]
      }`}
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
        <Message
          message={log.message}
          search={search}
          shouldHighlight={shouldHighlight}
        />
      </TableCell>
    </LogVirtualRow>
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
    <LogVirtualRow
      virtualRow={virtualRow}
      virtualizer={virtualizer}
      height={ROW_HEIGHT_PX}
    >
      <LogStatusCell>
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
      </LogStatusCell>
    </LogVirtualRow>
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
    <LogVirtualRow
      virtualRow={virtualRow}
      virtualizer={virtualizer}
      height={LIVE_STATUS_ROW_HEIGHT_PX}
    >
      <LogStatusCell>
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
      </LogStatusCell>
    </LogVirtualRow>
  )
}
