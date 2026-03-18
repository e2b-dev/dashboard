'use client'

import {
  useVirtualizer,
  type VirtualItem,
  type Virtualizer,
} from '@tanstack/react-virtual'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import type {
  BuildDetailsModel,
  BuildLogModel,
} from '@/core/domains/builds/models'
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
import { Loader } from '@/ui/primitives/loader'
import { Table, TableBody, TableCell } from '@/ui/primitives/table'
import { LOG_RETENTION_MS } from '../templates/builds/constants'
import { LogLevel, Message, Timestamp } from './logs-cells'
import type { LogLevelFilter as BuildLogLevelFilter } from './logs-filter-params'
import { useBuildLogs } from './use-build-logs'
import useLogFilters from './use-log-filters'

// Column width are calculated as max width of the content + padding
const COLUMN_WIDTHS_PX = { timestamp: 176 + 16, level: 52 + 16 } as const
const ROW_HEIGHT_PX = 26
const LIVE_STATUS_ROW_HEIGHT_PX = ROW_HEIGHT_PX + 16
const VIRTUAL_OVERSCAN = 16
const SCROLL_LOAD_THRESHOLD_PX = 200

interface LogsProps {
  buildDetails: BuildDetailsModel | undefined
  teamIdOrSlug: string
  templateId: string
  buildId: string
}

export default function Logs({
  buildDetails,
  teamIdOrSlug,
  templateId,
  buildId,
}: LogsProps) {
  'use no memo'

  const { level, setLevel } = useLogFilters()

  if (!buildDetails) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden relative gap-3">
        <LogLevelFilter
          level={level}
          onLevelChange={setLevel}
          renderOption={(optionLevel) => <LogLevel level={optionLevel} />}
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

  return (
    <LogsContent
      buildDetails={buildDetails}
      teamIdOrSlug={teamIdOrSlug}
      templateId={templateId}
      buildId={buildId}
      level={level}
      setLevel={setLevel}
    />
  )
}

interface LogsContentProps {
  buildDetails: BuildDetailsModel
  teamIdOrSlug: string
  templateId: string
  buildId: string
  level: BuildLogLevelFilter | null
  setLevel: (level: BuildLogLevelFilter | null) => void
}

function LogsContent({
  buildDetails,
  teamIdOrSlug,
  templateId,
  buildId,
  level,
  setLevel,
}: LogsContentProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [lastNonEmptyLogs, setLastNonEmptyLogs] = useState<BuildLogModel[]>([])

  const { isRefetchingFromFilterChange, onFetchComplete } =
    useFilterRefetchTracking(level)

  const {
    logs,
    isInitialized,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    fetchNextPage,
  } = useBuildLogs({
    teamIdOrSlug,
    templateId,
    buildId,
    level,
    buildStatus: buildDetails.status,
  })

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
  const showLoader = (isFetching || isRefetchingFromFilterChange) && !hasLogs
  const showEmpty = !isFetching && !hasLogs && !isRefetchingFromFilterChange
  const showRefetchOverlay = isRefetchingFromFilterChange && hasLogs
  const isBuilding = buildDetails.status === 'building'

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden relative gap-3">
      <LogLevelFilter
        level={level}
        onLevelChange={setLevel}
        renderOption={(optionLevel) => <LogLevel level={optionLevel} />}
      />

      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto">
        <Table style={{ display: 'grid', minWidth: 'min-content' }}>
          <LogsTableHeader
            timestampWidth={COLUMN_WIDTHS_PX.timestamp}
            levelWidth={COLUMN_WIDTHS_PX.level}
            timestampSortDirection="asc"
          />

          {showLoader && <LogsLoaderBody />}
          {showEmpty && (
            <EmptyBody hasRetainedLogs={buildDetails.hasRetainedLogs} />
          )}
          {hasLogs && (
            <VirtualizedLogsBody
              logs={renderedLogs}
              scrollContainerRef={scrollContainerRef}
              startedAt={buildDetails.startedAt}
              onLoadMore={handleLoadMore}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              showRefetchOverlay={showRefetchOverlay}
              isInitialized={isInitialized}
              level={level}
              isBuilding={isBuilding}
            />
          )}
        </Table>
      </div>
    </div>
  )
}

function useFilterRefetchTracking(level: BuildLogLevelFilter | null) {
  const [isRefetchingFromFilterChange, setIsRefetching] = useState(false)
  const isInitialRender = useRef(true)
  const previousLevelRef = useRef<BuildLogLevelFilter | null>(level)

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      previousLevelRef.current = level
      return
    }

    if (previousLevelRef.current !== level) {
      previousLevelRef.current = level
      setIsRefetching(true)
    }
  }, [level])

  const onFetchComplete = useCallback(() => setIsRefetching(false), [])

  return { isRefetchingFromFilterChange, onFetchComplete }
}

interface EmptyBodyProps {
  hasRetainedLogs: boolean
}

function EmptyBody({ hasRetainedLogs }: EmptyBodyProps) {
  const description = hasRetainedLogs
    ? undefined
    : `This build has exceeded the ${LOG_RETENTION_MS / 24 / 60 / 60 / 1000} day retention limit.`

  return <LogsEmptyBody description={description} />
}

interface VirtualizedLogsBodyProps {
  logs: BuildLogModel[]
  scrollContainerRef: RefObject<HTMLDivElement | null>
  startedAt: number
  onLoadMore: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  showRefetchOverlay: boolean
  isInitialized: boolean
  level: BuildLogLevelFilter | null
  isBuilding: boolean
}

function VirtualizedLogsBody({
  logs,
  scrollContainerRef,
  startedAt,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
  showRefetchOverlay,
  isInitialized,
  level,
  isBuilding,
}: VirtualizedLogsBodyProps) {
  const maxWidthRef = useRef<number>(0)

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
    level,
  })

  useMaintainScrollOnPrepend({
    scrollContainerRef,
    logsCount: logs.length,
    isFetchingNextPage,
  })

  const showStatusRow = hasNextPage || isFetchingNextPage
  const logsStartIndex = showStatusRow ? 1 : 0
  const liveStatusRowIndex = logsStartIndex + logs.length
  const virtualRowsCount = logs.length + (showStatusRow ? 1 : 0) + 1

  const virtualizer = useVirtualizer({
    count: virtualRowsCount,
    estimateSize: (index) =>
      index === liveStatusRowIndex ? LIVE_STATUS_ROW_HEIGHT_PX : ROW_HEIGHT_PX,
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
        const isStatusRow = showStatusRow && virtualRow.index === 0

        if (isStatusRow) {
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
              isBuilding={isBuilding}
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
            isZebraRow={logIndex % 2 === 1}
            virtualRow={virtualRow}
            virtualizer={virtualizer}
            startedAt={startedAt}
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

    scrollContainer.addEventListener('scroll', handleScroll, {
      passive: true,
    })
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
  level: BuildLogLevelFilter | null
}

function useAutoScrollToBottom({
  scrollContainerRef,
  logsCount,
  isInitialized,
  level,
}: UseAutoScrollToBottomParams) {
  const isAutoScrollEnabledRef = useRef(true)
  const prevLogsCountRef = useRef(0)
  const prevLevelRef = useRef(level)
  const hasInitialScrolled = useRef(false)

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return

    const handleScroll = () => {
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight
      isAutoScrollEnabledRef.current = distanceFromBottom < ROW_HEIGHT_PX * 2
    }

    el.addEventListener('scroll', handleScroll, {
      passive: true,
    })
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
    if (prevLevelRef.current !== level) {
      prevLevelRef.current = level
      hasInitialScrolled.current = false
      prevLogsCountRef.current = 0
    }
  }, [level])

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
  log: BuildLogModel
  isZebraRow: boolean
  virtualRow: VirtualItem
  virtualizer: Virtualizer<HTMLDivElement, Element>
  startedAt: number
}

function LogRow({
  log,
  isZebraRow,
  virtualRow,
  virtualizer,
  startedAt,
}: LogRowProps) {
  const millisAfterStart = log.timestampUnix - startedAt

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
        <Timestamp
          timestampUnix={log.timestampUnix}
          millisAfterStart={millisAfterStart}
        />
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
              <span>retrieving older build logs</span>
              <Loader variant="dots" size="sm" className="font-mono" />
            </>
          ) : (
            'Scroll to load older build logs'
          )}
        </span>
      </LogStatusCell>
    </LogVirtualRow>
  )
}

interface LiveStatusRowProps {
  virtualRow: VirtualItem
  virtualizer: Virtualizer<HTMLDivElement, Element>
  isBuilding: boolean
}

function LiveStatusRow({
  virtualRow,
  virtualizer,
  isBuilding,
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
              isBuilding
                ? 'text-accent-positive-highlight'
                : 'text-accent-info-highlight'
            }
          >
            {isBuilding ? 'live' : 'end'}
          </span>
          <span className="text-fg-secondary">]</span>
          <span>
            {isBuilding
              ? 'No more build logs to show. Waiting for new entries...'
              : 'No more build logs to show'}
          </span>
        </span>
      </LogStatusCell>
    </LogVirtualRow>
  )
}
