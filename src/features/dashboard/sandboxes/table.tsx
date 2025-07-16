'use client'

import { useRef, useMemo, useEffect } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import {
  ColumnFiltersState,
  ColumnSizingState,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  FilterFn,
  Row,
} from '@tanstack/react-table'
import { DataTable } from '@/ui/data-table'
import useIsMounted from '@/lib/hooks/use-is-mounted'
import {
  fuzzyFilter,
  dateRangeFilter,
  resourceRangeFilter,
  COLUMNS,
  SandboxWithMetrics,
} from './table-config'
import React from 'react'
import { useSandboxTableStore } from '@/features/dashboard/sandboxes/stores/table-store'
import { SandboxesHeader } from './header'
import { TableBody } from './table-body'
import { subHours } from 'date-fns'
import { useColumnSizeVars } from '@/lib/hooks/use-column-size-vars'
import { Sandbox, Template } from '@/types/api'
import ClientOnly from '@/ui/client-only'
import TableHeader from './table-header'
import { cn } from '@/lib/utils'
import { SIDEBAR_TRANSITION_CLASSNAMES } from '@/ui/primitives/sidebar'
import { useSandboxesMetrics } from './hooks/use-sandboxes-metrics'
import { ClientSandboxesMetrics } from '@/types/sandboxes.types'
import { SANDBOXES_METRICS_POLLING_MS } from '@/configs/intervals'

const INITIAL_VISUAL_ROWS_COUNT = 50

interface SandboxesTableProps {
  sandboxes: Sandbox[]
  templates: Template[]
  initialMetrics: ClientSandboxesMetrics | null
}

export default function SandboxesTable({
  sandboxes,
  templates,
  initialMetrics,
}: SandboxesTableProps) {
  'use no memo'

  const isMounted = useIsMounted()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [columnSizing, setColumnSizing] = useLocalStorage<ColumnSizingState>(
    'sandboxes:columnSizing',
    {},
    {
      deserializer: (value) => JSON.parse(value),
      serializer: (value) => JSON.stringify(value),
    }
  )

  const {
    startedAtFilter,
    templateIds,
    cpuCount,
    memoryMB,
    rowPinning,
    sorting,
    globalFilter,
    setSorting,
    setGlobalFilter,
    setRowPinning,
  } = useSandboxTableStore()

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )

  const [visualRowsCount, setVisualRowsCount] = React.useState(
    INITIAL_VISUAL_ROWS_COUNT
  )

  const resetScroll = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
    setVisualRowsCount(INITIAL_VISUAL_ROWS_COUNT)
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
    if (templateIds.length === 0) {
      newFilters = newFilters.filter((f) => f.id !== 'template')
    } else {
      newFilters = newFilters.filter((f) => f.id !== 'template')
      newFilters.push({ id: 'template', value: templateIds })
    }

    // Handle CPU filter
    if (!cpuCount) {
      newFilters = newFilters.filter((f) => f.id !== 'cpuCount')
    } else {
      newFilters = newFilters.filter((f) => f.id !== 'cpuCount')
      newFilters.push({ id: 'cpuCount', value: cpuCount })
    }

    // Handle memory filter
    if (!memoryMB) {
      newFilters = newFilters.filter((f) => f.id !== 'memoryMB')
    } else {
      newFilters = newFilters.filter((f) => f.id !== 'memoryMB')
      newFilters.push({ id: 'memoryMB', value: memoryMB })
    }

    resetScroll()
    setColumnFilters(newFilters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAtFilter, templateIds, cpuCount, memoryMB])

  // effect hook for scrolling to top when sorting or global filter changes
  React.useEffect(() => {
    resetScroll()
  }, [sorting, globalFilter])

  const [visualRows, setVisualRows] = React.useState<Row<SandboxWithMetrics>[]>(
    []
  )

  const { metrics } = useSandboxesMetrics({
    initialMetrics,
    sandboxes: visualRows.map((row) => row.original),
    pollingInterval: SANDBOXES_METRICS_POLLING_MS,
  })

  const data = useMemo(() => {
    const result = sandboxes.map((sandbox) => ({
      ...sandbox,
      metrics: metrics?.[sandbox.sandboxID] ?? null,
    })) as SandboxWithMetrics[]

    return result
  }, [sandboxes, metrics])

  const table = useReactTable({
    columns: COLUMNS,
    data,
    state: {
      globalFilter,
      sorting,
      columnSizing,
      columnFilters,
      rowPinning,
      templates,
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableMultiSort: false,
    columnResizeMode: 'onChange' as const,
    enableColumnResizing: true,
    keepPinnedRows: true,
    filterFns: {
      fuzzy: fuzzyFilter,
      dateRange: dateRangeFilter,
      resourceRange: resourceRangeFilter,
    },
    enableGlobalFilter: true,
    globalFilterFn: fuzzyFilter as FilterFn<SandboxWithMetrics>,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnSizingChange: setColumnSizing,
    onRowPinningChange: setRowPinning,
  })

  const columnSizeVars = useColumnSizeVars(table)

  const centerRows = table.getCenterRows()

  useEffect(() => {
    setVisualRows(centerRows.slice(0, visualRowsCount))
  }, [centerRows, visualRowsCount])

  const handleBottomReached = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollTop + clientHeight >= scrollHeight) {
      setVisualRowsCount((state) => state + INITIAL_VISUAL_ROWS_COUNT)
    }
  }

  return (
    <ClientOnly className="flex h-full flex-col pt-3">
      <SandboxesHeader
        searchInputRef={searchInputRef}
        templates={templates}
        table={table}
      />

      <div
        className={cn(
          'bg-bg mt-4 flex-1 overflow-x-auto md:max-w-[calc(100svw-var(--sidebar-width-active))]',
          SIDEBAR_TRANSITION_CLASSNAMES
        )}
      >
        {isMounted && (
          <DataTable
            className={cn(
              'h-full overflow-y-auto md:min-w-[calc(100svw-var(--sidebar-width-active))]',
              SIDEBAR_TRANSITION_CLASSNAMES
            )}
            onScroll={handleBottomReached}
            style={{ ...columnSizeVars }}
            ref={scrollRef}
          >
            <TableHeader
              topRows={table.getTopRows()}
              headerGroups={table.getHeaderGroups()}
              state={table.getState()}
            />
            <TableBody
              sandboxes={sandboxes}
              table={table}
              visualRows={visualRows}
            />
          </DataTable>
        )}
      </div>
    </ClientOnly>
  )
}
