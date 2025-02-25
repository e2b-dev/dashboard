'use client'

import { useRef } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import {
  ColumnFiltersState,
  ColumnSizingState,
  useReactTable,
} from '@tanstack/react-table'
import {
  DataTable,
  DataTableHeader,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from '@/ui/data-table'
import useIsMounted from '@/lib/hooks/use-is-mounted'
import {
  fallbackData,
  sandboxesTableConfig,
  SandboxWithMetrics,
  useColumns,
} from './table-config'
import React from 'react'
import { useSandboxTableStore } from '@/features/dashboard/sandboxes/stores/table-store'
import { SandboxesHeader } from './header'
import { TableBody } from './table-body'
import { flexRender } from '@tanstack/react-table'
import { subHours } from 'date-fns'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { cn } from '@/lib/utils'
import { useColumnSizeVars } from '@/lib/hooks/use-column-size-vars'
import { Template } from '@/types/api'
import ClientOnly from '@/ui/client-only'

const INITIAL_VISUAL_ROWS_COUNT = 50

interface SandboxesTableProps {
  sandboxes: SandboxWithMetrics[]
  templates: Template[]
}

export default function SandboxesTable({
  sandboxes,
  templates,
}: SandboxesTableProps) {
  'use no memo'

  const isMounted = useIsMounted()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const team = useSelectedTeam()

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
    pollingInterval,
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
  }, [startedAtFilter, templateIds, cpuCount, memoryMB])

  // effect hook for scrolling to top when sorting or global filter changes
  React.useEffect(() => {
    resetScroll()
  }, [sorting, globalFilter])

  // table definitions
  const columns = useColumns([])

  const table = useReactTable<SandboxWithMetrics>({
    ...sandboxesTableConfig,
    columns: columns ?? fallbackData,
    data: sandboxes ?? fallbackData,
    state: {
      globalFilter,
      sorting,
      columnSizing,
      columnFilters,
      rowPinning,
      // @ts-expect-error team is not a valid state
      team,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnSizingChange: setColumnSizing,
    onRowPinningChange: setRowPinning,
  })

  const columnSizeVars = useColumnSizeVars(table)

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

      <div className="mt-4 max-w-[calc(100svw-var(--protected-sidebar-width))] flex-1 overflow-x-auto bg-bg">
        {isMounted && (
          <DataTable
            className="h-full min-w-[calc(100svw-var(--protected-sidebar-width))] overflow-y-auto"
            onScroll={handleBottomReached}
            style={{ ...columnSizeVars }}
            ref={scrollRef}
          >
            <DataTableHeader
              className={cn(
                'sticky top-0 shadow-sm',
                table.getTopRows()?.length > 0 && 'mb-3'
              )}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <DataTableRow key={headerGroup.id} className="hover:bg-bg">
                  {headerGroup.headers.map((header) => (
                    <DataTableHead
                      key={header.id}
                      header={header}
                      style={{
                        width: header.getSize(),
                      }}
                      sorting={sorting.find((s) => s.id === header.id)?.desc}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </DataTableHead>
                  ))}
                </DataTableRow>
              ))}
              {sandboxes &&
                table.getTopRows()?.length > 0 &&
                table.getTopRows()?.map((row, index) => (
                  <DataTableRow
                    key={row.id}
                    className={cn(
                      'bg-bg-100 hover:bg-bg-100',
                      index === 0 && 'border-t'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <DataTableCell cell={cell} key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </DataTableCell>
                    ))}
                  </DataTableRow>
                ))}
            </DataTableHeader>

            <TableBody
              sandboxes={sandboxes}
              table={table}
              visualRowsCount={visualRowsCount}
            />
          </DataTable>
        )}
      </div>
    </ClientOnly>
  )
}
