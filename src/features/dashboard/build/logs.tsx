'use client'

import { cn } from '@/lib/utils'
import type { BuildLogDTO } from '@/server/api/models/builds.models'
import { useTRPC } from '@/trpc/client'
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
  useInfiniteQuery,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query'
import {
  useVirtualizer,
  VirtualItem,
  Virtualizer,
} from '@tanstack/react-virtual'
import {
  RefObject,
  use,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { LogLevel, Message, Timestamp } from './logs-cells'
import { type LogLevelFilter } from './logs-filter-params'
import useLogFilters from './use-log-filters'

const COLUMN_WIDTHS_PX = { timestamp: 164, level: 92 } as const
const ROW_HEIGHT_PX = 32
const VIRTUAL_OVERSCAN = 16
const REFETCH_INTERVAL_MS = 5_000
const SCROLL_LOAD_THRESHOLD_PX = 200
const LOG_KEY_MESSAGE_TRUNCATE_LENGTH = 64

const EMPTY_LOGS: BuildLogDTO[] = []

function getLogKey(log: BuildLogDTO): string {
  const truncatedMessage = log.message.slice(0, LOG_KEY_MESSAGE_TRUNCATE_LENGTH)
  return `${log.timestampUnix}:${log.level}:${truncatedMessage}`
}

const LEVEL_OPTIONS: Array<{ value: LogLevelFilter; label: string }> = [
  { value: 'debug', label: 'Debug' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warn' },
  { value: 'error', label: 'Error' },
]

interface LogsProps {
  params: PageProps<'/dashboard/[teamIdOrSlug]/templates/[templateId]/builds/[buildId]'>['params']
  isBuilding: boolean
}

export default function Logs({ params, isBuilding }: LogsProps) {
  'use no memo'

  const { teamIdOrSlug, templateId, buildId } = use(params)
  const trpc = useTRPC()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { data: buildDetails } = useSuspenseQuery(
    trpc.builds.buildDetails.queryOptions(
      { teamIdOrSlug, templateId, buildId },
      {
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: ({ state }) =>
          state.data?.status === 'building' ? 'always' : false,
        refetchInterval: ({ state }) =>
          state.data?.status === 'building' ? REFETCH_INTERVAL_MS : false,
      }
    )
  )

  const { level, setLevel } = useLogFilters()
  const { isRefetchingFromFilterChange, onFetchComplete } =
    useFilterRefetchTracking(level)

  const { logs, hasNextPage, isFetchingNextPage, isFetching, fetchNextPage } =
    useBuildLogs({
      trpc,
      teamIdOrSlug,
      templateId,
      buildId,
      level,
      isBuilding,
    })

  useEffect(() => {
    if (!isFetching && isRefetchingFromFilterChange) {
      onFetchComplete()
    }
  }, [isFetching, isRefetchingFromFilterChange, onFetchComplete])

  const hasLogs = logs.length > 0
  const showLoader = isRefetchingFromFilterChange && !hasLogs
  const showEmpty = !isFetching && !hasLogs
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
          {showEmpty && <EmptyBody />}
          {hasLogs && (
            <VirtualizedLogsBody
              logs={logs}
              scrollContainerRef={scrollContainerRef}
              startedAt={buildDetails.startedAt}
              onLoadMore={handleLoadMore}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              showRefetchOverlay={showRefetchOverlay}
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

interface UseBuildLogsParams {
  trpc: ReturnType<typeof useTRPC>
  teamIdOrSlug: string
  templateId: string
  buildId: string
  level: LogLevelFilter | null
  isBuilding: boolean
}

function useBuildLogs({
  trpc,
  teamIdOrSlug,
  templateId,
  buildId,
  level,
  isBuilding,
}: UseBuildLogsParams) {
  const [forwardLogsAccumulator, setForwardLogsAccumulator] = useState<
    BuildLogDTO[]
  >([])

  useEffect(() => {
    setForwardLogsAccumulator([])
  }, [level])

  const {
    data: backwardsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching: isFetchingBackwards,
  } = useInfiniteQuery(
    trpc.builds.buildLogsBackwards.infiniteQueryOptions(
      { teamIdOrSlug, templateId, buildId, level: level ?? undefined },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: false,
        refetchInterval: false,
      }
    )
  )

  const backwardsLogs = useMemo(
    () => backwardsData?.pages.flatMap((p) => p.logs) ?? EMPTY_LOGS,
    [backwardsData]
  )

  const forwardCursor = useMemo(() => {
    const newestAccumulated = forwardLogsAccumulator[0]?.timestampUnix
    const newestBackwards = backwardsLogs[0]?.timestampUnix
    return newestAccumulated ?? newestBackwards
  }, [forwardLogsAccumulator, backwardsLogs])

  const { data: forwardData, isFetching: isFetchingForward } = useQuery(
    trpc.builds.buildLogsForward.queryOptions(
      {
        teamIdOrSlug,
        templateId,
        buildId,
        cursor: forwardCursor,
        level: level ?? undefined,
      },
      {
        enabled: isBuilding,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: 'always',
        refetchInterval: REFETCH_INTERVAL_MS,
      }
    )
  )

  useEffect(() => {
    const newLogs = forwardData?.logs
    if (!newLogs || newLogs.length === 0) return

    setForwardLogsAccumulator((accumulated) => {
      if (accumulated.length === 0) return newLogs

      const existingKeys = new Set(accumulated.map(getLogKey))
      const uniqueNewLogs = newLogs.filter(
        (log) => !existingKeys.has(getLogKey(log))
      )

      if (uniqueNewLogs.length === 0) return accumulated

      return [...uniqueNewLogs, ...accumulated].sort(
        (a, b) => b.timestampUnix - a.timestampUnix
      )
    })
  }, [forwardData?.logs])

  const mergedLogs = useMemo(() => {
    if (forwardLogsAccumulator.length === 0) return backwardsLogs
    if (backwardsLogs.length === 0) return forwardLogsAccumulator

    const backwardsKeys = new Set(backwardsLogs.map(getLogKey))
    const uniqueForwardLogs = forwardLogsAccumulator.filter(
      (log) => !backwardsKeys.has(getLogKey(log))
    )

    return [...uniqueForwardLogs, ...backwardsLogs]
  }, [forwardLogsAccumulator, backwardsLogs])

  return {
    logs: mergedLogs,
    hasNextPage,
    isFetchingNextPage,
    isFetching: isFetchingBackwards || isFetchingForward,
    fetchNextPage,
  }
}

function LogsTableHeader() {
  return (
    <TableHeader
      className="bg-bg"
      style={{ display: 'grid', position: 'sticky', top: 0, zIndex: 1 }}
    >
      <TableRow style={{ display: 'flex', minWidth: '100%' }}>
        <TableHead
          className="text-fg"
          style={{ display: 'flex', width: COLUMN_WIDTHS_PX.timestamp }}
        >
          Timestamp <ArrowDownIcon className="size-3" />
        </TableHead>
        <TableHead style={{ display: 'flex', width: COLUMN_WIDTHS_PX.level }}>
          Level
        </TableHead>
        <TableHead style={{ display: 'flex', flex: 1 }}>Message</TableHead>
      </TableRow>
    </TableHeader>
  )
}

function LoaderBody() {
  return (
    <TableBody style={{ display: 'grid' }}>
      <TableRow style={{ display: 'flex', minWidth: '100%' }}>
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
      <TableRow style={{ display: 'flex', minWidth: '100%' }}>
        <TableCell className="flex-1">
          <div className="h-[35vh] w-full gap-2 relative flex justify-center items-center p-6">
            <ListIcon className="size-5" />
            <p className="prose-body-highlight">No logs found</p>
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
            size="sm"
            className="font-sans w-min normal-case"
          >
            <LevelIndicator level={selectedLevel} />
            Min Level • {selectedLabel}
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
}

function VirtualizedLogsBody({
  logs,
  scrollContainerRef,
  startedAt,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
  showRefetchOverlay,
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

  const virtualizer = useVirtualizer({
    count: logs.length + 1,
    estimateSize: () => ROW_HEIGHT_PX,
    getScrollElement: () => scrollContainerRef.current,
    overscan: VIRTUAL_OVERSCAN,
  })

  const currentScrollWidth = tbodyRef.current?.scrollWidth ?? 0
  if (currentScrollWidth > maxWidthRef.current) {
    maxWidthRef.current = currentScrollWidth
  }

  return (
    <TableBody
      ref={tbodyRef}
      className={showRefetchOverlay ? 'opacity-70 transition-opacity' : ''}
      style={{
        display: 'grid',
        height: `${virtualizer.getTotalSize()}px`,
        width: maxWidthRef.current,
        minWidth: '100%',
        position: 'relative',
      }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const isStatusRow = virtualRow.index === logs.length

        if (isStatusRow) {
          return (
            <StatusRow
              key="status-row"
              virtualRow={virtualRow}
              virtualizer={virtualizer}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
            />
          )
        }

        return (
          <LogRow
            key={virtualRow.index}
            log={logs[virtualRow.index]!}
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
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      if (
        distanceFromBottom < SCROLL_LOAD_THRESHOLD_PX &&
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
        className="py-0"
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
  hasNextPage: boolean
  isFetchingNextPage: boolean
}

function StatusRow({
  virtualRow,
  virtualizer,
  hasNextPage,
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
        className="py-0 w-full"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span className="text-fg-tertiary text-sm">
          {isFetchingNextPage ? (
            <span className="inline-flex items-center gap-1">
              Loading
              <Loader variant="dots" />
            </span>
          ) : hasNextPage ? (
            'Scroll to load more'
          ) : (
            'Nothing more to load'
          )}
        </span>
      </TableCell>
    </TableRow>
  )
}
