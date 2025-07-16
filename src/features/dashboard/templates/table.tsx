'use client'

import {
  ColumnFiltersState,
  flexRender,
  TableOptions,
  useReactTable,
} from '@tanstack/react-table'
import { DefaultTemplate, Template } from '@/types/api'
import { DataTableHead, DataTableRow, DataTableHeader } from '@/ui/data-table'
import { useEffect, useState, useRef } from 'react'
import { ColumnSizingState } from '@tanstack/react-table'
import { DataTable } from '@/ui/data-table'
import { fallbackData, templatesTableConfig, useColumns } from './table-config'
import { useTemplateTableStore } from './stores/table-store'
import { useLocalStorage } from 'usehooks-ts'
import { useColumnSizeVars } from '@/lib/hooks/use-column-size-vars'
import { TableBody } from './table-body'
import TemplatesHeader from './header'
import ClientOnly from '@/ui/client-only'
import HelpTooltip from '@/ui/help-tooltip'
import { SIDEBAR_TRANSITION_CLASSNAMES } from '@/ui/primitives/sidebar'
import { cn } from '@/lib/utils'

interface TemplatesTableProps {
  templates: (Template | DefaultTemplate)[]
}

const INITIAL_VISUAL_ROWS_COUNT = 50

export default function TemplatesTable({ templates }: TemplatesTableProps) {
  'use no memo'

  const scrollRef = useRef<HTMLDivElement>(null)
  const [visualRowsCount, setVisualRowsCount] = useState(
    INITIAL_VISUAL_ROWS_COUNT
  )

  const { sorting, setSorting, globalFilter, setGlobalFilter } =
    useTemplateTableStore()

  const [columnSizing, setColumnSizing] = useLocalStorage<ColumnSizingState>(
    'templates:columnSizing',
    {},
    {
      deserializer: (value) => JSON.parse(value),
      serializer: (value) => JSON.stringify(value),
    }
  )

  const { cpuCount, memoryMB, isPublic } = useTemplateTableStore()

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  // Effect hooks for filters
  useEffect(() => {
    let newFilters = [...columnFilters]

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

    // Handle public filter
    if (isPublic === undefined) {
      newFilters = newFilters.filter((f) => f.id !== 'public')
    } else {
      newFilters = newFilters.filter((f) => f.id !== 'public')
      newFilters.push({ id: 'public', value: isPublic })
    }

    setColumnFilters(newFilters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpuCount, memoryMB, isPublic])

  const columns = useColumns([])

  const table = useReactTable<Template>({
    ...templatesTableConfig,
    data: templates ?? fallbackData,
    columns: columns ?? fallbackData,
    state: {
      globalFilter,
      sorting,
      columnSizing,
      columnFilters,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onColumnFiltersChange: setColumnFilters,
  } as TableOptions<Template>)

  const columnSizeVars = useColumnSizeVars(table)

  const resetScroll = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
    setVisualRowsCount(INITIAL_VISUAL_ROWS_COUNT)
  }

  // Add effect hook for scrolling to top when sorting or global filter changes
  useEffect(() => {
    resetScroll()
  }, [sorting, globalFilter])

  const handleBottomReached = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollTop + clientHeight >= scrollHeight) {
      setVisualRowsCount((state) => state + INITIAL_VISUAL_ROWS_COUNT)
    }
  }

  return (
    <ClientOnly className="flex h-full flex-col pt-3">
      <TemplatesHeader table={table} />

      <div
        className={cn(
          'bg-bg mt-4 flex-1 overflow-x-auto md:max-w-[calc(100svw-var(--sidebar-width-active))]',
          SIDEBAR_TRANSITION_CLASSNAMES
        )}
      >
        <DataTable
          className={cn(
            'h-full overflow-y-auto md:min-w-[calc(100svw-var(--sidebar-width-active))]',
            SIDEBAR_TRANSITION_CLASSNAMES
          )}
          style={{ ...columnSizeVars }}
          onScroll={handleBottomReached}
          ref={scrollRef}
        >
          <DataTableHeader className="sticky top-0 shadow-sm">
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
                    {header.id === 'public' ? (
                      <HelpTooltip>
                        Public templates can be used by all users to start
                        Sandboxes, but can only be edited by your team.
                      </HelpTooltip>
                    ) : null}
                    <span className="truncate">
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
            templates={templates}
            table={table}
            visualRowsCount={visualRowsCount}
          />
        </DataTable>
      </div>
    </ClientOnly>
  )
}
