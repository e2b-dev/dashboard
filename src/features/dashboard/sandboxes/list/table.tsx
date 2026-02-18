'use client'

import { useSandboxTableStore } from '@/features/dashboard/sandboxes/list/stores/table-store'
import { useColumnSizeVars } from '@/lib/hooks/use-column-size-vars'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { useVirtualRows } from '@/lib/hooks/use-virtual-rows'
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
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  ColumnFiltersState,
  ColumnSizingState,
  FilterFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { subHours } from 'date-fns'
import React, { useMemo, useRef } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { SandboxesHeader } from './header'
import { useSandboxesMetrics } from './hooks/use-sandboxes-metrics'
import { TableBody } from './table-body'
import {
  COLUMNS,
  dateRangeFilter,
  fuzzyFilter,
  resourceRangeFilter,
  SandboxWithMetrics,
} from './table-config'

const ROW_HEIGHT_PX = 32
const VIRTUAL_OVERSCAN = 8

// metrics fetched via useSandboxesMetrics

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
      {
        teamIdOrSlug,
      },
      {
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
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
  } = useSandboxTableStore()

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )

  const resetScroll = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }

  // Effect hooks for filters
  React.useEffect(() => {
    let newFilters = [...columnFilters]

    // Handle startedAt filter
    if (!startedAtFilter) {
      newFilters = newFilters.filter((f) => f.id !== 'startedAt')
    } else {
      const now = new Date()
      const from =
        startedAtFilter === '1h ago'
          ? subHours(now, 1)
          : startedAtFilter === '6h ago'
            ? subHours(now, 6)
            : startedAtFilter === '12h ago'
              ? subHours(now, 12)
              : undefined

      newFilters = newFilters.filter((f) => f.id !== 'startedAt')
      newFilters.push({ id: 'startedAt', value: { from, to: now } })
    }

    // Handle template filter
    if (templateFilters.length === 0) {
      newFilters = newFilters.filter((f) => f.id !== 'template')
    } else {
      newFilters = newFilters.filter((f) => f.id !== 'template')
      newFilters.push({ id: 'template', value: templateFilters })
    }

    // Handle CPU filter
    if (!cpuCount) {
      newFilters = newFilters.filter((f) => f.id !== 'cpuUsage')
    } else {
      newFilters = newFilters.filter((f) => f.id !== 'cpuUsage')
      newFilters.push({ id: 'cpuUsage', value: cpuCount })
    }

    // Handle memory filter
    if (!memoryMB) {
      newFilters = newFilters.filter((f) => f.id !== 'ramUsage')
    } else {
      newFilters = newFilters.filter((f) => f.id !== 'ramUsage')
      newFilters.push({ id: 'ramUsage', value: memoryMB })
    }

    resetScroll()
    setColumnFilters(newFilters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAtFilter, templateFilters, cpuCount, memoryMB])

  React.useEffect(() => {
    resetScroll()
  }, [sorting, globalFilter])

  const resolvedSorting =
    sorting.length > 0 ? sorting : [{ id: 'startedAt', desc: true }]

  const table = useReactTable({
    columns: COLUMNS,
    data: data.sandboxes,
    state: {
      globalFilter,
      sorting: resolvedSorting,
      columnSizing,
      columnFilters,
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableMultiSort: false,
    enableSortingRemoval: false,
    columnResizeMode: 'onChange' as const,
    enableColumnResizing: true,
    filterFns: {
      fuzzy: fuzzyFilter,
      dateRange: dateRangeFilter,
      resourceRange: resourceRangeFilter,
    },
    enableGlobalFilter: true,
    globalFilterFn: fuzzyFilter as FilterFn<SandboxWithMetrics>,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onColumnFiltersChange: setColumnFilters,
  })

  const columnSizeVars = useColumnSizeVars(table)

  const centerRows = table.getCenterRows()

  const {
    virtualRows: visualRows,
    totalHeight,
    paddingTop,
  } = useVirtualRows<SandboxWithMetrics>({
    rows: centerRows,
    scrollRef: scrollRef as unknown as React.RefObject<HTMLElement | null>,
    estimateSizePx: ROW_HEIGHT_PX,
    overscan: VIRTUAL_OVERSCAN,
  })

  const virtualizedTotalHeight = totalHeight
  const virtualPaddingTop = paddingTop

  const memoizedVisualRows = useMemo(
    () => visualRows.map((r) => r.original),
    [visualRows]
  )

  useSandboxesMetrics({
    sandboxes: memoizedVisualRows,
  })

  return (
    <ClientOnly className="flex h-full min-h-0 flex-col md:max-w-[calc(100svw-var(--sidebar-width-active))] p-3 md:p-6">
      <SandboxesHeader
        table={table}
        onRefresh={refetch}
        isRefreshing={isFetching}
      />

      <div
        className={cn(
          'bg-bg flex-1 mt-4 overflow-x-auto w-full md:max-w-[calc(calc(100svw-48px)-var(--sidebar-width-active))]',
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
          <DataTableHeader className="sticky top-0 shadow-xs bg-bg z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <DataTableRow key={headerGroup.id} className="border-b-0">
                {headerGroup.headers.map((header) => (
                  <DataTableHead
                    key={header.id}
                    header={header}
                    sorting={
                      resolvedSorting.find((s) => s.id === header.id)?.desc
                    }
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
          <TableBody
            sandboxes={data.sandboxes}
            table={table}
            visualRows={visualRows}
            virtualizedTotalHeight={virtualizedTotalHeight}
            virtualPaddingTop={virtualPaddingTop}
          />
        </DataTable>
      </div>
    </ClientOnly>
  )
}
