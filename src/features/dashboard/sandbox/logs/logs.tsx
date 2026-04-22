'use client'

import {
  useVirtualizer,
  type VirtualItem,
  type Virtualizer,
} from '@tanstack/react-virtual'
import {
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { LOG_RETENTION_MS } from '@/configs/logs'
import type { SandboxLogModel } from '@/core/modules/sandboxes/models'
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
import { ChevronRightIcon } from '@/ui/primitives/icons'
import { DebouncedInput } from '@/ui/primitives/input'
import { Loader } from '@/ui/primitives/loader'
import { Table, TableBody, TableCell } from '@/ui/primitives/table'
import { useSandboxContext } from '../context'
import { Logger, LogLevel, Message, Timestamp } from './logs-cells'
import type { LogLevelFilter as SandboxLogLevelFilter } from './logs-filter-params'
import useLogFilters from './use-log-filters'
import { useSandboxLogs } from './use-sandbox-logs'

// column widths are calculated as max width of the content + padding
const COLUMN_WIDTHS_PX = {
  expander: 28,
  timestamp: 148 + 16,
  level: 48 + 16,
  logger: 180,
} as const
const ROW_HEIGHT_PX = 26
const LOG_DETAILS_MIN_HEIGHT_PX = 96
const LOG_DETAILS_PADDING_Y_PX = 24
const LOG_DETAILS_LINE_HEIGHT_PX = 20
const LOG_DETAILS_FIELD_GAP_PX = 6
const LOG_DETAILS_ENTRY_HEADER_HEIGHT_PX = 28
const LOG_DETAILS_ENTRY_GAP_PX = 12
const LIVE_STATUS_ROW_HEIGHT_PX = ROW_HEIGHT_PX + 16
const VIRTUAL_OVERSCAN = 16
const SCROLL_LOAD_THRESHOLD_PX = 200
const LOG_RETENTION_DAYS = LOG_RETENTION_MS / 24 / 60 / 60 / 1000
const STRUCTURED_LOG_ENTRIES_FIELD = 'entries'
const LOG_DETAILS_APPROX_CHARS_PER_LINE = 110

interface LogsProps {
  teamSlug: string
  sandboxId: string
}

function checkIfSandboxStillHasLogs(startedAtIso: string) {
  const startedAtUnix = new Date(startedAtIso).getTime()

  if (Number.isNaN(startedAtUnix)) {
    return true
  }

  return Date.now() - startedAtUnix < LOG_RETENTION_MS
}

export default function SandboxLogs({ teamSlug, sandboxId }: LogsProps) {
  'use no memo'

  const { sandboxInfo, sandboxLifecycle, isRunning } = useSandboxContext()
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
              expanderWidth={COLUMN_WIDTHS_PX.expander}
              timestampWidth={COLUMN_WIDTHS_PX.timestamp}
              levelWidth={COLUMN_WIDTHS_PX.level}
              loggerWidth={COLUMN_WIDTHS_PX.logger}
              timestampSortDirection="asc"
            />
            <LogsLoaderBody />
          </Table>
        </div>
      </div>
    )
  }

  const hasRetainedLogs = checkIfSandboxStillHasLogs(
    sandboxLifecycle?.createdAt ?? sandboxInfo.startedAt
  )

  return (
    <LogsContent
      teamSlug={teamSlug}
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
  teamSlug: string
  sandboxId: string
  isRunning: boolean
  hasRetainedLogs: boolean
  level: SandboxLogLevelFilter | null
  search: string
  setLevel: (level: SandboxLogLevelFilter | null) => void
  setSearch: (search: string) => void
}

function LogsContent({
  teamSlug,
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
  const [lastNonEmptyLogs, setLastNonEmptyLogs] = useState<SandboxLogModel[]>(
    []
  )

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
    teamSlug,
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
            expanderWidth={COLUMN_WIDTHS_PX.expander}
            timestampWidth={COLUMN_WIDTHS_PX.timestamp}
            levelWidth={COLUMN_WIDTHS_PX.level}
            loggerWidth={COLUMN_WIDTHS_PX.logger}
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
  logs: SandboxLogModel[]
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
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(
    () => new Set()
  )

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

  const toggleLogExpanded = useCallback((logId: string) => {
    setExpandedLogIds((current) => {
      const next = new Set(current)
      if (next.has(logId)) {
        next.delete(logId)
      } else {
        next.add(logId)
      }

      return next
    })
  }, [])

  const virtualizer = useVirtualizer({
    count: virtualRowsCount,
    estimateSize: (index) => {
      if (index === liveStatusRowIndex) {
        return LIVE_STATUS_ROW_HEIGHT_PX
      }

      if (showLoadMoreStatusRow && index === 0) {
        return ROW_HEIGHT_PX
      }

      const logIndex = index - logsStartIndex
      const log = logs[logIndex]
      if (!log) {
        return ROW_HEIGHT_PX
      }

      const logId = getLogRowId(log, logIndex)
      return getLogRowHeight(log, expandedLogIds.has(logId))
    },
    getScrollElement: () => scrollContainerElement,
    overscan: VIRTUAL_OVERSCAN,
    paddingStart: 8,
  })

  useEffect(() => {
    virtualizer.measure()
  }, [expandedLogIds, virtualizer])

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
        const logId = getLogRowId(log, logIndex)
        const isExpanded = expandedLogIds.has(logId)

        return (
          <LogRow
            key={virtualRow.key}
            logId={logId}
            log={log}
            search={search}
            shouldHighlight={!showRefetchOverlay}
            isZebraRow={logIndex % 2 === 1}
            isExpanded={isExpanded}
            onToggleExpanded={toggleLogExpanded}
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
  logId: string
  log: SandboxLogModel
  search: string
  shouldHighlight: boolean
  isZebraRow: boolean
  isExpanded: boolean
  onToggleExpanded: (logId: string) => void
  virtualRow: VirtualItem
  virtualizer: Virtualizer<HTMLDivElement, Element>
}

function getLogRowId(log: SandboxLogModel, logIndex: number) {
  return [
    log.timestampUnix,
    logIndex,
    log.level,
    log.logger ?? '',
    log.message,
  ].join(':')
}

function getLogFieldEntries(log: SandboxLogModel) {
  if (!log.fields) {
    return []
  }

  const structuredEntries = getStructuredLogEntries(log)

  return Object.entries(log.fields).filter(
    ([key, value]) =>
      value !== undefined &&
      !(key === STRUCTURED_LOG_ENTRIES_FIELD && structuredEntries.length > 0)
  )
}

function getStructuredLogEntries(log: SandboxLogModel) {
  const entries = log.fields?.[STRUCTURED_LOG_ENTRIES_FIELD]

  return Array.isArray(entries) ? entries : []
}

function hasLogFields(log: SandboxLogModel) {
  return (
    getLogFieldEntries(log).length > 0 ||
    getStructuredLogEntries(log).length > 0
  )
}

function getLogDetailsHeight(log: SandboxLogModel) {
  const fieldEntries = getLogFieldEntries(log)
  const structuredEntries = getStructuredLogEntries(log)
  if (fieldEntries.length === 0 && structuredEntries.length === 0) {
    return 0
  }

  const structuredEntriesHeight = structuredEntries.reduce(
    (totalHeight, entry) => totalHeight + getStructuredEntryHeight(entry),
    0
  )

  const structuredEntriesGapHeight =
    structuredEntries.length > 1
      ? (structuredEntries.length - 1) * LOG_DETAILS_ENTRY_GAP_PX
      : 0

  const separateFieldListGapHeight =
    structuredEntries.length > 0 && fieldEntries.length > 0
      ? LOG_DETAILS_ENTRY_GAP_PX
      : 0

  return Math.max(
    LOG_DETAILS_MIN_HEIGHT_PX,
    LOG_DETAILS_PADDING_Y_PX +
      structuredEntriesHeight +
      structuredEntriesGapHeight +
      separateFieldListGapHeight +
      getLogFieldListHeight(fieldEntries)
  )
}

function getLogRowHeight(log: SandboxLogModel, isExpanded: boolean) {
  return ROW_HEIGHT_PX + (isExpanded ? getLogDetailsHeight(log) : 0)
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('button,a,input,select,textarea,[role="button"]'))
  )
}

function formatLogFieldValue(value: unknown) {
  if (typeof value === 'string') {
    return value
  }

  return JSON.stringify(value, null, 2)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getFormattedValueLineCount(value: unknown) {
  return formatLogFieldValue(value)
    .split('\n')
    .reduce(
      (lineCount, line) =>
        lineCount +
        Math.max(1, Math.ceil(line.length / LOG_DETAILS_APPROX_CHARS_PER_LINE)),
      0
    )
}

function getLogFieldHeight([, value]: [string, unknown]) {
  return getFormattedValueLineCount(value) * LOG_DETAILS_LINE_HEIGHT_PX
}

function getLogFieldListHeight(entries: [string, unknown][]) {
  if (entries.length === 0) {
    return 0
  }

  return (
    entries.reduce(
      (totalHeight, entry) => totalHeight + getLogFieldHeight(entry),
      0
    ) +
    (entries.length - 1) * LOG_DETAILS_FIELD_GAP_PX
  )
}

function getStructuredEntryHeight(entry: unknown) {
  const bodyHeight = isRecord(entry)
    ? getLogFieldListHeight(Object.entries(entry))
    : getFormattedValueLineCount(entry) * LOG_DETAILS_LINE_HEIGHT_PX

  return LOG_DETAILS_ENTRY_HEADER_HEIGHT_PX + bodyHeight
}

function LogRow({
  logId,
  log,
  search,
  shouldHighlight,
  isZebraRow,
  isExpanded,
  onToggleExpanded,
  virtualRow,
  virtualizer,
}: LogRowProps) {
  const canExpand = hasLogFields(log)
  const rowHeight = getLogRowHeight(log, isExpanded)

  const toggleExpanded = useCallback(() => {
    if (canExpand) {
      onToggleExpanded(logId)
    }
  }, [canExpand, logId, onToggleExpanded])

  const onRowClick = useCallback(
    (event: MouseEvent<HTMLTableRowElement>) => {
      if (isInteractiveTarget(event.target)) {
        return
      }

      toggleExpanded()
    },
    [toggleExpanded]
  )

  const onRowKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTableRowElement>) => {
      if (!canExpand || isInteractiveTarget(event.target)) {
        return
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        toggleExpanded()
      }
    },
    [canExpand, toggleExpanded]
  )

  return (
    <LogVirtualRow
      virtualRow={virtualRow}
      virtualizer={virtualizer}
      height={rowHeight}
      style={{
        display: 'grid',
        gridTemplateColumns: `${COLUMN_WIDTHS_PX.expander}px ${COLUMN_WIDTHS_PX.timestamp}px ${COLUMN_WIDTHS_PX.level}px ${COLUMN_WIDTHS_PX.logger}px minmax(260px, 1fr)`,
        gridTemplateRows: isExpanded
          ? `${ROW_HEIGHT_PX}px ${getLogDetailsHeight(log)}px`
          : `${ROW_HEIGHT_PX}px`,
      }}
      className={cn(
        canExpand && 'cursor-pointer hover:bg-bg-hover focus:bg-bg-hover',
        isExpanded
          ? 'border-l-2 bg-bg'
          : ['border-l', isZebraRow && 'bg-bg-1/70'],
        LOG_LEVEL_LEFT_BORDER_CLASS[log.level as LogLevelValue]
      )}
      aria-expanded={canExpand ? isExpanded : undefined}
      tabIndex={canExpand ? 0 : undefined}
      onClick={onRowClick}
      onKeyDown={onRowKeyDown}
    >
      <TableCell
        className="py-0 px-0"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {canExpand ? (
          <button
            type="button"
            aria-label={
              isExpanded ? 'Collapse log fields' : 'Expand log fields'
            }
            aria-expanded={isExpanded}
            className="flex size-5 items-center justify-center text-fg-tertiary hover:text-fg transition-colors"
            onClick={(event) => {
              event.stopPropagation()
              toggleExpanded()
            }}
          >
            <ChevronRightIcon
              className={cn(
                'size-3 transition-transform',
                isExpanded ? 'rotate-90' : ''
              )}
            />
          </button>
        ) : null}
      </TableCell>
      <TableCell
        className="py-0 pr-4 pl-1.5!"
        style={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Timestamp timestampUnix={log.timestampUnix} />
      </TableCell>
      <TableCell
        className="py-0 px-0 pr-4"
        style={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <LogLevel level={log.level} />
      </TableCell>
      <TableCell
        className="py-0 px-0 pr-4"
        style={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Logger logger={log.logger} />
      </TableCell>
      <TableCell
        className="py-0 px-0 pr-4"
        style={{
          display: 'flex',
          alignItems: 'center',
          minWidth: 260,
          whiteSpace: 'nowrap',
        }}
      >
        <Message
          message={log.message}
          search={search}
          shouldHighlight={shouldHighlight}
        />
      </TableCell>
      {isExpanded ? <LogFieldsDetails log={log} /> : null}
    </LogVirtualRow>
  )
}

interface LogFieldsDetailsProps {
  log: SandboxLogModel
}

function LogFieldsDetails({ log }: LogFieldsDetailsProps) {
  const entries = getLogFieldEntries(log)
  const structuredEntries = getStructuredLogEntries(log)
  if (entries.length === 0 && structuredEntries.length === 0) {
    return null
  }

  return (
    <TableCell
      className="py-0 pr-0 pl-0!"
      style={{ display: 'block', gridColumn: '1 / -1', minWidth: 0 }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="h-full overflow-visible border-t border-stroke/70 bg-bg px-4 py-3">
        <div className="space-y-3">
          {structuredEntries.length > 0 ? (
            <div className="space-y-3">
              {structuredEntries.map((entry, index) => (
                <StructuredLogEntry
                  // These entries are read-only snapshots from one batched log event.
                  key={index}
                  index={index}
                  entry={entry}
                />
              ))}
            </div>
          ) : null}
          {entries.length > 0 ? (
            <LogFieldList entries={entries} className="pt-0" />
          ) : null}
        </div>
      </div>
    </TableCell>
  )
}

interface StructuredLogEntryProps {
  index: number
  entry: unknown
}

function StructuredLogEntry({ index, entry }: StructuredLogEntryProps) {
  return (
    <section className="border-b border-stroke/60 pb-3 last:border-b-0 last:pb-0">
      <div className="mb-2 font-mono text-[11px] font-medium uppercase tracking-normal text-fg-tertiary">
        Entry {index + 1}
      </div>
      {isRecord(entry) ? (
        <LogFieldList entries={Object.entries(entry)} />
      ) : (
        <pre className="m-0 whitespace-pre-wrap break-words font-mono text-[13px] leading-5 text-fg-secondary">
          {formatLogFieldValue(entry)}
        </pre>
      )}
    </section>
  )
}

interface LogFieldListProps {
  className?: string
  entries: [string, unknown][]
}

function LogFieldList({ className, entries }: LogFieldListProps) {
  return (
    <dl
      className={cn(
        'grid grid-cols-[minmax(96px,180px)_minmax(0,1fr)] gap-x-4 gap-y-1.5',
        className
      )}
    >
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="min-w-0 truncate font-mono text-[12px] leading-5 text-fg-tertiary">
            {key}
          </dt>
          <dd className="min-w-0 font-mono text-[13px] leading-5 text-fg-secondary">
            <pre className="m-0 whitespace-pre-wrap break-words">
              {formatLogFieldValue(value)}
            </pre>
          </dd>
        </div>
      ))}
    </dl>
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
