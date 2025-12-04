'use client'

import useKeydown from '@/lib/hooks/use-keydown'
import type { BuildLogDTO } from '@/server/api/models/builds.models'
import { useTRPC } from '@/trpc/client'
import { ArrowDownIcon, SearchIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import { Kbd } from '@/ui/primitives/kbd'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Row, useReactTable } from '@tanstack/react-table'
import {
  useVirtualizer,
  VirtualItem,
  Virtualizer,
} from '@tanstack/react-virtual'
import {
  RefObject,
  use,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { useDebounceValue } from 'usehooks-ts'
import { LogLevel, Message, Timestamp } from './logs-cells'
import { columns, defaultSorting, getLogsTableOptions } from './logs-config'

const COLUMN_WIDTHS_PX = {
  timestamp: 164,
  level: 92,
} as const

const ROW_HEIGHT_PX = 32
const VIRTUAL_OVERSCAN = 16

const BUILDS_REFETCH_INTERVAL_MS = 5_000

const defaultData: BuildLogDTO[] = []

interface LogsProps {
  params: PageProps<'/dashboard/[teamIdOrSlug]/templates/[templateId]/builds/[buildId]'>['params']
}

export default function Logs({ params }: LogsProps) {
  'use no memo'

  const { teamIdOrSlug, templateId, buildId } = use(params)
  const trpc = useTRPC()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { data: buildDetails, error } = useSuspenseQuery(
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

  const logs = useMemo(() => {
    return buildDetails?.logs ?? defaultData
  }, [buildDetails])

  const [searchValue, setSearchValue] = useState('')
  const [debouncedSearch] = useDebounceValue(searchValue, 300)

  const tableOptions = useMemo(() => getLogsTableOptions(), [])

  const state = useMemo(
    () => ({
      globalFilter: debouncedSearch,
      sorting: defaultSorting,
    }),
    [debouncedSearch]
  )

  const table = useReactTable({
    ...tableOptions,
    data: logs,
    columns,
    state,
  })

  const rows = table.getRowModel().rows
  const totalCount = buildDetails?.logs.length ?? 0

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden relative gap-3">
      <LogsTableFilters
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        filteredCount={rows.length}
        totalCount={totalCount}
      />

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

          <LogsTableBody rows={rows} scrollContainerRef={scrollContainerRef} />
        </Table>
      </div>
    </div>
  )
}

interface LogsTableFiltersProps {
  searchValue: string
  setSearchValue: (value: string) => void
  filteredCount: number
  totalCount: number
}

function LogsTableFilters({
  searchValue,
  setSearchValue,
  filteredCount,
  totalCount,
}: LogsTableFiltersProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useKeydown((e) => {
    if (e.key === '/') {
      e.preventDefault()
      inputRef.current?.focus()
      return true
    }
  })

  return (
    <div className="flex w-full min-h-0 justify-between gap-3">
      <div className="flex items-center gap-4">
        <div className="relative w-64">
          <Input
            ref={inputRef}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search logs"
            className="pl-7 pr-10"
          />
          <SearchIcon className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-fg-tertiary" />
          <Kbd
            keys={['/']}
            className="absolute top-1/2 right-2 -translate-y-1/2"
          />
        </div>
        <p className="prose-label-highlight text-fg-tertiary uppercase">
          {filteredCount === totalCount
            ? `${totalCount} logs`
            : `${filteredCount} of ${totalCount} logs`}
        </p>
      </div>
    </div>
  )
}

interface LogsTableBodyProps {
  rows: Row<BuildLogDTO>[]
  scrollContainerRef: RefObject<HTMLDivElement | null>
}

const rerenderReducer = () => ({})

function LogsTableBody({ rows, scrollContainerRef }: LogsTableBodyProps) {
  const tbodyRef = useRef<HTMLTableSectionElement>(null)
  const maxWidthRef = useRef<number>(0)
  const [, rerender] = useReducer(rerenderReducer, 0)

  useEffect(() => {
    if (scrollContainerRef.current) {
      rerender()
    }
  }, [scrollContainerRef])

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
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
      style={{
        display: 'grid',
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: maxWidthRef.current,
        minWidth: '100%',
        position: 'relative',
      }}
    >
      {virtualItems.map((virtualRow) => {
        const row = rows[virtualRow.index]!
        return (
          <LogsTableRow
            key={row.id}
            log={row.original}
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
          millisAfterStart={log.millisAfterStart}
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
