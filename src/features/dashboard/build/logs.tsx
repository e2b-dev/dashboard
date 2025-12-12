'use client'

import { cn } from '@/lib/utils'
import type { BuildLogDTO } from '@/server/api/models/builds.models'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
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
import { useInfiniteQuery, useSuspenseQuery } from '@tanstack/react-query'
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
import { ALL_LOG_LEVELS, type LogLevelFilter } from './logs-filter-params'
import useLogFilters from './use-log-filters'

const COLUMN_WIDTHS_PX = {
  timestamp: 164,
  level: 92,
} as const

const ROW_HEIGHT_PX = 32
const VIRTUAL_OVERSCAN = 16

const BUILDS_REFETCH_INTERVAL_MS = 5_000

const defaultData: BuildLogDTO[] = []

function useFilterChangeTracking(levels: LogLevelFilter[]) {
  const [isFilterRefetching, setIsFilterRefetching] = useState(false)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setIsFilterRefetching(true)
  }, [levels])

  const clearFilterRefetching = useCallback(() => {
    setIsFilterRefetching(false)
  }, [])

  return { isFilterRefetching, clearFilterRefetching }
}

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
      {
        teamIdOrSlug,
        templateId,
        buildId,
      },
      {
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: ({ state }) =>
          state.data?.status === 'building' ? 'always' : false,
        refetchInterval: ({ state }) =>
          state.data?.status === 'building'
            ? BUILDS_REFETCH_INTERVAL_MS
            : false,
      }
    )
  )

  const { levels, setLevels } = useLogFilters()
  const { isFilterRefetching, clearFilterRefetching } =
    useFilterChangeTracking(levels)

  const {
    data: paginatedLogs,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useInfiniteQuery(
    trpc.builds.buildLogsBackwards.infiniteQueryOptions(
      {
        teamIdOrSlug,
        templateId,
        buildId,
        levels,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: isBuilding ? 'always' : false,
        refetchInterval: isBuilding ? BUILDS_REFETCH_INTERVAL_MS : false,
      }
    )
  )

  useEffect(() => {
    if (!isFetching && isFilterRefetching) {
      clearFilterRefetching()
    }
  }, [isFetching, isFilterRefetching, clearFilterRefetching])

  const logs = useMemo(
    () => paginatedLogs?.pages.flatMap((p) => p.logs) ?? defaultData,
    [paginatedLogs]
  )

  const hasData = logs.length > 0
  const showLoader = isFilterRefetching && !hasData
  const showEmpty = !isFetching && !hasData
  const showFilterRefetchingOverlay = isFilterRefetching && hasData

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden relative gap-3">
      <LogsLevelFilter levels={levels} setLevels={setLevels} />

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
                className="text-fg"
                style={{ display: 'flex', width: COLUMN_WIDTHS_PX.timestamp }}
              >
                Timestamp <ArrowDownIcon className="size-3" />
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

          {showLoader && (
            <TableBody style={{ display: 'grid' }}>
              <TableRow style={{ display: 'flex', minWidth: '100%' }}>
                <TableCell className="flex-1">
                  <div className="h-[35svh] w-full flex justify-center items-center">
                    <Loader variant="slash" size="lg" />
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          )}

          {showEmpty && (
            <TableBody style={{ display: 'grid' }}>
              <TableRow style={{ display: 'flex', minWidth: '100%' }}>
                <TableCell className="flex-1">
                  <LogsEmpty />
                </TableCell>
              </TableRow>
            </TableBody>
          )}

          {hasData && (
            <LogsTableBody
              logs={logs}
              scrollContainerRef={scrollContainerRef}
              startedAt={buildDetails.startedAt}
              onLoadMore={handleLoadMore}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              showFilterRefetchingOverlay={showFilterRefetchingOverlay}
            />
          )}
        </Table>
      </div>
    </div>
  )
}

const LEVEL_OPTIONS: Array<{ value: LogLevelFilter; label: string }> = [
  { value: 'debug', label: 'Debug' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warn' },
  { value: 'error', label: 'Error' },
]

interface DashedLevelCircleIconProps {
  level: LogLevelFilter
  index: number
}

function DashedLevelCircleIcon({ level, index }: DashedLevelCircleIconProps) {
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
      style={{ rotate: `${index * 50}deg`, zIndex: index + 1 }}
    />
  )
}

function LevelIcons({ selectedLevels }: { selectedLevels: LogLevelFilter[] }) {
  const levelOrder: LogLevelFilter[] = ['debug', 'info', 'warn', 'error']
  const sortedLevels = levelOrder.filter((l) => selectedLevels.includes(l))

  return (
    <div className="flex -space-x-1.5">
      {sortedLevels.map((level, i) => (
        <DashedLevelCircleIcon key={level} level={level} index={i} />
      ))}
    </div>
  )
}

interface LogsLevelFilterProps {
  levels: LogLevelFilter[]
  setLevels: (levels: LogLevelFilter[]) => void
}

function LogsLevelFilter({ levels, setLevels }: LogsLevelFilterProps) {
  const [localLevels, setLocalLevels] = useState<LogLevelFilter[]>(levels)

  useEffect(() => {
    setLocalLevels(levels)
  }, [levels])

  const toggleLevel = (level: LogLevelFilter) => {
    const isSelected = localLevels.includes(level)

    if (isSelected && localLevels.length === 1) {
      return
    }

    const newLevels = isSelected
      ? localLevels.filter((l) => l !== level)
      : [...localLevels, level]

    setLocalLevels(newLevels)
    setLevels(newLevels)
  }

  const selectAllLevels = () => {
    const allLevels = LEVEL_OPTIONS.map((l) => l.value)
    setLocalLevels(allLevels)
    setLevels(allLevels)
  }

  return (
    <div className="flex w-full min-h-0 justify-between gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="font-sans w-min normal-case"
          >
            <LevelIcons selectedLevels={localLevels} /> Level •{' '}
            {localLevels.length}/{LEVEL_OPTIONS.length}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuCheckboxItem
            checked={localLevels.length === LEVEL_OPTIONS.length}
            onCheckedChange={selectAllLevels}
            onSelect={(e) => e.preventDefault()}
          >
            All
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {LEVEL_OPTIONS.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={localLevels.includes(option.value)}
              onCheckedChange={() => toggleLevel(option.value)}
              onSelect={(e) => e.preventDefault()}
            >
              <LogLevel level={option.value} />
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function LogsEmpty() {
  return (
    <div className="h-[35vh] w-full gap-2 relative flex justify-center items-center p-6">
      <ListIcon className="size-5" />
      <p className="prose-body-highlight">No logs found</p>
    </div>
  )
}

const SCROLL_THRESHOLD_PX = 200

interface LogsTableBodyProps {
  logs: BuildLogDTO[]
  scrollContainerRef: RefObject<HTMLDivElement | null>
  startedAt: number
  onLoadMore: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  showFilterRefetchingOverlay: boolean
}

const rerenderReducer = () => ({})

function LogsTableBody({
  logs,
  scrollContainerRef,
  startedAt,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
  showFilterRefetchingOverlay,
}: LogsTableBodyProps) {
  const tbodyRef = useRef<HTMLTableSectionElement>(null)
  const maxWidthRef = useRef<number>(0)
  const [, rerender] = useReducer(rerenderReducer, 0)

  useEffect(() => {
    if (scrollContainerRef.current) {
      rerender()
    }
  }, [scrollContainerRef])

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      if (
        distanceFromBottom < SCROLL_THRESHOLD_PX &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        onLoadMore()
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [scrollContainerRef, hasNextPage, isFetchingNextPage, onLoadMore])

  const rowVirtualizer = useVirtualizer({
    count: logs.length + 1,
    estimateSize: () => ROW_HEIGHT_PX,
    getScrollElement: () => scrollContainerRef.current,
    overscan: VIRTUAL_OVERSCAN,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  const currentScrollWidth = tbodyRef.current?.scrollWidth ?? 0
  if (currentScrollWidth > maxWidthRef.current) {
    maxWidthRef.current = currentScrollWidth
  }

  return (
    <TableBody
      ref={tbodyRef}
      className={
        showFilterRefetchingOverlay ? 'opacity-70 transition-opacity' : ''
      }
      style={{
        display: 'grid',
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: maxWidthRef.current,
        minWidth: '100%',
        position: 'relative',
      }}
    >
      {virtualItems.map((virtualRow) => {
        const isStatusRow = virtualRow.index === logs.length

        if (isStatusRow) {
          return (
            <LogsStatusRow
              key="status-row"
              virtualRow={virtualRow}
              rowVirtualizer={rowVirtualizer}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
            />
          )
        }

        const log = logs[virtualRow.index]!
        return (
          <LogsTableRow
            key={virtualRow.index}
            log={log}
            virtualRow={virtualRow}
            rowVirtualizer={rowVirtualizer}
            startedAt={startedAt}
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
  startedAt: number
}

function LogsTableRow({
  log,
  virtualRow,
  rowVirtualizer,
  startedAt,
}: LogsTableRowProps) {
  const millisAfterStart = log.timestampUnix - startedAt

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

interface LogsStatusRowProps {
  virtualRow: VirtualItem
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>
  hasNextPage: boolean
  isFetchingNextPage: boolean
}

function LogsStatusRow({
  virtualRow,
  rowVirtualizer,
  hasNextPage,
  isFetchingNextPage,
}: LogsStatusRowProps) {
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
