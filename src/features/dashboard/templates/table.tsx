'use client'

import { useColumnSizeVars } from '@/lib/hooks/use-column-size-vars'
import { useVirtualRows } from '@/lib/hooks/use-virtual-rows'
import { cn } from '@/lib/utils'
import { DefaultTemplate, Template } from '@/types/api.types'
import ClientOnly from '@/ui/client-only'
import {
  DataTable,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/ui/data-table'
import HelpTooltip from '@/ui/help-tooltip'
import { SIDEBAR_TRANSITION_CLASSNAMES } from '@/ui/primitives/sidebar'
import {
  ColumnFiltersState,
  ColumnSizingState,
  flexRender,
  TableOptions,
  useReactTable,
} from '@tanstack/react-table'
import { useEffect, useRef, useState } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import TemplatesHeader from './header'
import { useTemplateTableStore } from './stores/table-store'
import { TemplatesTableBody as TableBody } from './table-body'
import { fallbackData, templatesTableConfig, useColumns } from './table-config'

interface TemplatesTableProps {
  templates: (Template | DefaultTemplate)[]
}

const ROW_HEIGHT_PX = 32
const VIRTUAL_OVERSCAN = 8

export default function TemplatesTable({ templates }: TemplatesTableProps) {
  'use no memo'

  const scrollRef = useRef<HTMLDivElement>(null)

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
  }

  // Add effect hook for scrolling to top when sorting or global filter changes
  useEffect(() => {
    resetScroll()
  }, [sorting, globalFilter])

  const centerRows = table.getCenterRows()
  const { virtualRows, totalHeight, paddingTop } = useVirtualRows<Template>({
    rows: centerRows,
    scrollRef: scrollRef as unknown as React.RefObject<HTMLElement | null>,
    estimateSizePx: ROW_HEIGHT_PX,
    overscan: VIRTUAL_OVERSCAN,
  })

  return (
    <ClientOnly className="flex h-full flex-col p-3 md:p-6">
      <TemplatesHeader table={table} />

      <div
        className={cn(
          'bg-bg mt-4 flex-1 overflow-x-auto md:max-w-[calc(100svw-48px-var(--sidebar-width-active))]',
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
            virtualizedTotalHeight={totalHeight}
            virtualPaddingTop={paddingTop}
            virtualRows={virtualRows}
          />
        </DataTable>
      </div>
    </ClientOnly>
  )
}
