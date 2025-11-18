'use client'

import { useColumnSizeVars } from '@/lib/hooks/use-column-size-vars'
import { useVirtualRows } from '@/lib/hooks/use-virtual-rows'
import { cn } from '@/lib/utils'
import { useTRPC } from '@/trpc/client'
import { Template } from '@/types/api.types'
import ClientOnly from '@/ui/client-only'
import {
  DataTable,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/ui/data-table'
import ErrorBoundary from '@/ui/error'
import HelpTooltip from '@/ui/help-tooltip'
import { SIDEBAR_TRANSITION_CLASSNAMES } from '@/ui/primitives/sidebar'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  ColumnFiltersState,
  ColumnSizingState,
  flexRender,
  TableOptions,
  useReactTable,
} from '@tanstack/react-table'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import LoadingLayout from '../loading-layout'
import TemplatesHeader from './header'
import { useTemplateTableStore } from './stores/table-store'
import { TemplatesTableBody as TableBody } from './table-body'
import { fallbackData, templatesTableConfig, useColumns } from './table-config'

const ROW_HEIGHT_PX = 32
const VIRTUAL_OVERSCAN = 8

export default function TemplatesTable() {
  'use no memo'

  const trpc = useTRPC()
  const { teamIdOrSlug } =
    useParams<
      Awaited<PageProps<'/dashboard/[teamIdOrSlug]/templates'>['params']>
    >()

  const {
    data: templatesData,
    error: templatesError,
    isFetching: isTemplatesFetching,
  } = useSuspenseQuery(
    trpc.templates.getTemplates.queryOptions(
      { teamIdOrSlug },
      {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      }
    )
  )

  const { data: defaultTemplatesData, error: defaultTemplatesError } =
    useSuspenseQuery(
      trpc.templates.getDefaultTemplatesCached.queryOptions(undefined, {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      })
    )

  const templates = useMemo(
    () => [
      ...(templatesData?.templates ?? []),
      ...(defaultTemplatesData?.templates ?? []),
    ],
    [templatesData, defaultTemplatesData]
  )

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

  if (isTemplatesFetching) {
    return <LoadingLayout />
  }

  if (templatesError || defaultTemplatesError) {
    const error = templatesError || defaultTemplatesError
    return (
      <ErrorBoundary
        error={{
          name: 'Templates Error',
          message: error?.message ?? 'Failed to load templates',
        }}
        description="Could not load templates"
      />
    )
  }

  return (
    <ClientOnly className="flex h-full min-h-0 flex-col md:max-w-[calc(100svw-var(--sidebar-width-active))] p-3 md:p-6">
      <TemplatesHeader table={table} />

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
