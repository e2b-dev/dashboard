'use client'

import { keepPreviousData, useSuspenseQuery } from '@tanstack/react-query'
import {
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
import { useSandboxListTableStore } from '@/features/dashboard/sandboxes/list/stores/table-store'
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
import { sandboxIdFuzzyFilter, sandboxListColumns } from './table-config'

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
}: {
  startedAtFilter: SandboxStartedAtFilter
  templateFilters: string[]
  cpuCount?: number
  memoryMB?: number
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

  return filters
}

export default function SandboxesTable() {
  'use no memo'

  const scrollRef = useRef<HTMLDivElement>(null)
  const { teamIdOrSlug } =
    useRouteParams<'/dashboard/[teamIdOrSlug]/sandboxes'>()

  const trpc = useTRPC()

  const [columnSizing, setColumnSizing] = useLocalStorage<ColumnSizingState>(
    'sandboxes:columnSizing',
    {},
    {
      deserializer: (value) => JSON.parse(value),
      serializer: (value) => JSON.stringify(value),
    }
  )

  const { data, refetch, isFetching } = useSuspenseQuery(
    trpc.sandboxes.getSandboxes.queryOptions(
      { teamIdOrSlug },
      {
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
        placeholderData: keepPreviousData,
      }
    )
  )

  const {
    startedAtFilter,
    templateFilters,
    cpuCount,
    memoryMB,
    sorting,
    globalFilter,
    setSorting,
    setGlobalFilter,
  } = useSandboxListTableStore()

  const columnFilters = useMemo(
    () =>
      buildColumnFilters({
        startedAtFilter,
        templateFilters,
        cpuCount,
        memoryMB,
      }),
    [startedAtFilter, templateFilters, cpuCount, memoryMB]
  )

  const activeSorting = getSandboxListEffectiveSorting(sorting)

  const table = useReactTable<SandboxListRow>({
    columns: sandboxListColumns,
    data: data.sandboxes,
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
      scrollRef.current.scrollLeft = 0
    }
  }, [activeSorting, globalFilter, columnFilters])

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
          <SandboxesTableBody table={table} scrollRef={scrollRef} />
        </DataTable>
      </div>
    </ClientOnly>
  )
}
