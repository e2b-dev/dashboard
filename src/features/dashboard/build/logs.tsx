'use client'

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
  RefObject,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react'
import { LOG_RETENTION_MS } from '../templates/builds/constants'
import { LogLevel, Message, Timestamp } from './logs-cells'
import { type LogLevelFilter } from './logs-filter-params'
import { useBuildLogs } from './use-build-logs'
import useLogFilters from './use-log-filters'

// Column width are calculated as max width of the content + padding
const COLUMN_WIDTHS_PX = { timestamp: 176 + 16, level: 52 + 16 } as const
const ROW_HEIGHT_PX = 26
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
            <LogsTableHeader />
            <LoaderBody />
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
          <LogsTableHeader />

          {showLoader && <LoaderBody />}
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
        <TableHead className="px-0 pr-4" style={{ display: 'flex', width: COLUMN_WIDTHS_PX.level }}>
          Level
        </TableHead>
        <TableHead className="px-0" style={{ display: 'flex', flex: 1 }}>Message</TableHead>
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
}

function EmptyBody({ hasRetainedLogs }: EmptyBodyProps) {
  return (
    <TableBody style={{ display: 'grid' }}>
      <TableRow style={{ display: 'flex', minWidth: '100%', marginTop: 8 }}>
        <TableCell className="flex-1">
          <div className="h-[35vh] w-full gap-2 relative flex flex-col justify-center items-center p-6">
            <div className="flex items-center gap-2">
              <ListIcon className="size-5" />
              <p className="prose-body-highlight">No logs found</p>
            </div>
            {!hasRetainedLogs && (
              <p className="text-fg-tertiary text-sm">
                This build has exceeded the{' '}
                {LOG_RETENTION_MS / 24 / 60 / 60 / 1000} day retention limit.
              </p>
            )}
          </div>
        </TableCell>
      </TableRow>
    </TableBody>
  )
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
          'border-accent-positive-highlight': level === 'info',
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
    level,
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
  virtualRow: VirtualItem
  virtualizer: Virtualizer<HTMLDivElement, Element>
  startedAt: number
}

function LogRow({ log, virtualRow, virtualizer, startedAt }: LogRowProps) {
  const millisAfterStart = log.timestampUnix - startedAt

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
        <span className="prose-body-highlight text-fg-tertiary uppercase">
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
