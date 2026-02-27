'use client'

import {
  useVirtualizer,
  type VirtualItem,
  type Virtualizer,
} from '@tanstack/react-virtual'
import {
  type RefObject,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react'
import {
  LOG_LEVEL_LEFT_BORDER_CLASS,
  type LogLevelValue,
} from '@/features/dashboard/common/log-cells'
import {
  LogStatusCell,
  LogsEmptyBody,
  LogsLoaderBody,
  LogsTableHeader,
  LogVirtualRow,
} from '@/features/dashboard/common/log-viewer-ui'
import { cn } from '@/lib/utils'
import type {
  BuildDetailsDTO,
  BuildLogDTO,
} from '@/server/api/models/builds.models'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { Loader } from '@/ui/primitives/loader'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'
import { LOG_RETENTION_MS } from '../templates/builds/constants'
import { LogLevel, Message, Timestamp } from './logs-cells'
import type { LogLevelFilter } from './logs-filter-params'
import { useBuildLogs } from './use-build-logs'
import useLogFilters from './use-log-filters'

// Column width are calculated as max width of the content + padding
const COLUMN_WIDTHS_PX = { timestamp: 176 + 16, level: 52 + 16 } as const
const ROW_HEIGHT_PX = 26
const LIVE_STATUS_ROW_HEIGHT_PX = ROW_HEIGHT_PX + 16
const VIRTUAL_OVERSCAN = 16
const SCROLL_LOAD_THRESHOLD_PX = 200

const LEVEL_OPTIONS: Array<{ value: LogLevelFilter; label: string }> = [
  { value: 'debug', label: 'Debug' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warn' },
  { value: 'error', label: 'Error' },
]

interface LogsProps {
  buildDetails: BuildDetailsDTO | undefined
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
        <LevelFilter level={level} onLevelChange={setLevel} />
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
  buildDetails: BuildDetailsDTO
  teamIdOrSlug: string
  templateId: string
  buildId: string
  level: LogLevelFilter | null
  setLevel: (level: LogLevelFilter | null) => void
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

  const hasLogs = logs.length > 0
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
      <LevelFilter level={level} onLevelChange={setLevel} />

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
              logs={logs}
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

function useFilterRefetchTracking(level: LogLevelFilter | null) {
  const [isRefetchingFromFilterChange, setIsRefetching] = useState(false)
  const isInitialRender = useRef(true)

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }
    setIsRefetching(true)
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

interface LevelFilterProps {
  level: LogLevelFilter | null
  onLevelChange: (level: LogLevelFilter | null) => void
}

function LevelFilter({ level, onLevelChange }: LevelFilterProps) {
  const selectedLevel = level ?? 'debug'
  const selectedLabel = LEVEL_OPTIONS.find(
    (o) => o.value === selectedLevel
  )?.label

  return (
    <div className="flex w-full min-h-0 justify-between gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="font-sans w-min normal-case prose-body-highlight h-9"
          >
            <LevelIndicator level={selectedLevel} />
            Min Level · {selectedLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={selectedLevel}
            onValueChange={(value) => onLevelChange(value as LogLevelFilter)}
          >
            {LEVEL_OPTIONS.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                <LogLevel level={option.value} />
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function LevelIndicator({ level }: { level: LogLevelFilter }) {
  return (
    <div
      className={cn(
        'size-3.5 rounded-full bg-bg border-[1.5px] border-dashed',
        {
          'border-fg-tertiary': level === 'debug',
          'border-accent-info-highlight': level === 'info',
          'border-accent-warning-highlight': level === 'warn',
          'border-accent-error-highlight': level === 'error',
        }
      )}
    />
  )
}

interface VirtualizedLogsBodyProps {
  logs: BuildLogDTO[]
  scrollContainerRef: RefObject<HTMLDivElement | null>
  startedAt: number
  onLoadMore: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  showRefetchOverlay: boolean
  isInitialized: boolean
  level: LogLevelFilter | null
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

        return (
          <LogRow
            key={virtualRow.key}
            log={logs[logIndex]!}
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
  level: LogLevelFilter | null
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
  log: BuildLogDTO
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
