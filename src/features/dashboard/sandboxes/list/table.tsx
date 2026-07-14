'use client'

import {
  keepPreviousData,
  useQuery,
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from '@tanstack/react-query'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnSizingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { subHours } from 'date-fns'
import { useEffect, useMemo, useRef } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import type { Sandboxes, SandboxState } from '@/core/modules/sandboxes/models'
import { SandboxIdSchema } from '@/core/shared/schemas/api'
import {
  isStatusFilterActive,
  useSandboxListTableStore,
} from '@/features/dashboard/sandboxes/list/stores/table-store'
import { useColumnSizeVars } from '@/lib/hooks/use-column-size-vars'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { cn } from '@/lib/utils'
import { useTRPC } from '@/trpc/client'
import ClientOnly from '@/ui/client-only'
import {
  DataTable,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/ui/data-table'
import { SIDEBAR_TRANSITION_CLASSNAMES } from '@/ui/primitives/sidebar'
import { SandboxesHeader } from './header'
import type { SandboxStartedAtFilter } from './stores/table-store'
import { getSandboxListEffectiveSorting } from './stores/table-store'
import { SandboxesTableBody } from './table-body'
import type { SandboxListRow } from './table-config'
import {
  sandboxIdFuzzyFilter,
  sandboxListColumns,
  useLegacySandboxListColumns,
} from './table-config'

const STARTED_AT_FILTER_HOURS: Record<
  Exclude<SandboxStartedAtFilter, undefined>,
  number
> = {
  '1h ago': 1,
  '6h ago': 6,
  '12h ago': 12,
}

function buildColumnFilters({
  startedAtFilter,
  templateFilters,
  cpuCount,
  memoryMB,
  statusFilters,
}: {
  startedAtFilter: SandboxStartedAtFilter
  templateFilters: string[]
  cpuCount?: number
  memoryMB?: number
  statusFilters?: SandboxState[]
}): ColumnFiltersState {
  const filters: ColumnFiltersState = []

  if (startedAtFilter) {
    const now = new Date()
    const from = subHours(now, STARTED_AT_FILTER_HOURS[startedAtFilter])

    filters.push({ id: 'startedAt', value: { from, to: now } })
  }

  if (templateFilters.length > 0) {
    filters.push({ id: 'template', value: templateFilters })
  }

  if (cpuCount) {
    filters.push({ id: 'cpuUsage', value: cpuCount })
  }

  if (memoryMB) {
    filters.push({ id: 'ramUsage', value: memoryMB })
  }

  if (statusFilters && isStatusFilterActive(statusFilters)) {
    filters.push({ id: 'status', value: statusFilters[0] })
  }

  return filters
}

const SANDBOXES_PAGE_SIZE = 50

const SANDBOX_ID_EXACT_SEARCH_MIN_LENGTH = 16

function getSearchedSandboxId(globalFilter: string): string | null {
  const query = globalFilter.trim()

  if (
    query.length < SANDBOX_ID_EXACT_SEARCH_MIN_LENGTH ||
    !SandboxIdSchema.safeParse(query).success
  ) {
    return null
  }

  return query
}

interface SandboxesTableViewProps {
  sandboxes: Sandboxes
  columns: ColumnDef<SandboxListRow>[]
  refetch: () => void
  isFetching: boolean
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  fetchNextPage?: () => void
}

function SandboxesTableView({
  sandboxes,
  columns,
  refetch,
  isFetching,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: SandboxesTableViewProps) {
  'use no memo'

  const scrollRef = useRef<HTMLDivElement>(null)

  const [columnSizing, setColumnSizing] = useLocalStorage<ColumnSizingState>(
    'sandboxes:columnSizing:v2',
    {},
    {
      deserializer: (value) => JSON.parse(value),
      serializer: (value) => JSON.stringify(value),
    }
  )

  const {
    startedAtFilter,
    templateFilters,
    cpuCount,
    memoryMB,
    statusFilters,
    sorting,
    globalFilter,
    setSorting,
    setGlobalFilter,
  } = useSandboxListTableStore()

  const hasStatusColumn = columns.some((column) => column.id === 'status')

  const columnFilters = useMemo(
    () =>
      buildColumnFilters({
        startedAtFilter,
        templateFilters,
        cpuCount,
        memoryMB,
        statusFilters: hasStatusColumn ? statusFilters : undefined,
      }),
    [
      startedAtFilter,
      templateFilters,
      cpuCount,
      memoryMB,
      statusFilters,
      hasStatusColumn,
    ]
  )

  const activeSorting = getSandboxListEffectiveSorting(sorting)

  const table = useReactTable<SandboxListRow>({
    columns,
    data: sandboxes,
    state: {
      globalFilter,
      sorting: activeSorting,
      columnSizing,
      columnFilters,
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableMultiSort: false,
    enableSortingRemoval: false,
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    enableGlobalFilter: true,
    globalFilterFn: sandboxIdFuzzyFilter,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
  })

  const columnSizeVars = useColumnSizeVars(table)
  const scrollResetKey = useMemo(
    () => JSON.stringify({ activeSorting, globalFilter, columnFilters }),
    [activeSorting, globalFilter, columnFilters]
  )

  useEffect(() => {
    void scrollResetKey

    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
      scrollRef.current.scrollLeft = 0
    }
  }, [scrollResetKey])

  const tableSorting = table.getState().sorting

  return (
    <ClientOnly className="flex h-full min-h-0 flex-col p-3 md:max-w-[calc(100svw-var(--sidebar-width-active))] md:p-6">
      <SandboxesHeader
        table={table}
        onRefresh={refetch}
        isRefreshing={isFetching}
      />

      <div
        className={cn(
          'bg-bg mt-4 flex-1 w-full overflow-x-auto md:max-w-[calc(calc(100svw-48px)-var(--sidebar-width-active))]',
          SIDEBAR_TRANSITION_CLASSNAMES
        )}
      >
        <DataTable
          className={cn(
            'h-full overflow-y-auto md:min-w-[calc(100svw-48px-var(--sidebar-width-active))]',
            SIDEBAR_TRANSITION_CLASSNAMES
          )}
          style={{ ...columnSizeVars }}
          ref={scrollRef}
        >
          <DataTableHeader className="bg-bg sticky top-0 z-10 shadow-xs">
            {table.getHeaderGroups().map((headerGroup) => (
              <DataTableRow key={headerGroup.id} className="border-b-0">
                {headerGroup.headers.map((header) => (
                  <DataTableHead
                    key={header.id}
                    header={header}
                    sorting={tableSorting.find((s) => s.id === header.id)?.desc}
                    align={
                      header.id === 'running' ||
                      header.id === 'cpuUsage' ||
                      header.id === 'ramUsage' ||
                      header.id === 'diskUsage'
                        ? 'right'
                        : 'left'
                    }
                  >
                    <span>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </span>
                  </DataTableHead>
                ))}
              </DataTableRow>
            ))}
          </DataTableHeader>
          <SandboxesTableBody
            table={table}
            scrollRef={scrollRef}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        </DataTable>
      </div>
    </ClientOnly>
  )
}

export function NewSandboxesTable() {
  const { teamSlug } = useRouteParams<'/dashboard/[teamSlug]/sandboxes'>()
  const trpc = useTRPC()
  const pollingInterval = useSandboxListTableStore(
    (state) => state.pollingInterval
  )
  const statusFilters = useSandboxListTableStore((state) => state.statusFilters)
  const globalFilter = useSandboxListTableStore((state) => state.globalFilter)

  const {
    data,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSuspenseInfiniteQuery(
    trpc.sandboxes.listSandboxesPaginated.infiniteQueryOptions(
      {
        teamSlug,
        limit: SANDBOXES_PAGE_SIZE,
        states: isStatusFilterActive(statusFilters) ? statusFilters : undefined,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        initialCursor: undefined,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
        refetchInterval: pollingInterval > 0 ? pollingInterval * 1_000 : false,
        placeholderData: keepPreviousData,
      }
    )
  )

  // The search input is debounced into globalFilter, so this fires at most
  // once per pause in typing.
  const searchedSandboxId = getSearchedSandboxId(globalFilter)
  const { data: exactMatch } = useQuery(
    trpc.sandboxes.findSandboxById.queryOptions(
      { teamSlug, sandboxId: searchedSandboxId ?? '' },
      {
        enabled: searchedSandboxId !== null,
        staleTime: 30_000,
      }
    )
  )

  const sandboxes = useMemo(() => {
    const loaded = data.pages.flatMap((page) => page.sandboxes)

    // Guard against results retained from a previous query after the search
    // was cleared or edited.
    if (
      !exactMatch ||
      exactMatch.sandboxID !== searchedSandboxId ||
      loaded.some((sandbox) => sandbox.sandboxID === exactMatch.sandboxID)
    ) {
      return loaded
    }

    return [...loaded, exactMatch]
  }, [data, exactMatch, searchedSandboxId])

  return (
    <SandboxesTableView
      sandboxes={sandboxes}
      columns={sandboxListColumns}
      refetch={refetch}
      isFetching={isFetching}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
    />
  )
}

export function LegacySandboxesTable() {
  const { teamSlug } = useRouteParams<'/dashboard/[teamSlug]/sandboxes'>()
  const trpc = useTRPC()
  const legacySandboxListColumns = useLegacySandboxListColumns()

  const { data, refetch, isFetching } = useSuspenseQuery(
    trpc.sandboxes.getSandboxes.queryOptions(
      { teamSlug },
      {
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
        placeholderData: keepPreviousData,
      }
    )
  )

  return (
    <SandboxesTableView
      sandboxes={data.sandboxes}
      columns={legacySandboxListColumns}
      refetch={refetch}
      isFetching={isFetching}
    />
  )
}

export default LegacySandboxesTable
