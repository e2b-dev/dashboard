'use client'

import {
  keepPreviousData,
  useSuspenseInfiniteQuery,
} from '@tanstack/react-query'
import {
  type ColumnSizingState,
  flexRender,
  type TableOptions,
  useReactTable,
} from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import type {
  DefaultTemplate,
  Template,
  TemplatesSort,
} from '@/core/modules/templates/models'
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
import ErrorBoundary from '@/ui/error'
import HelpTooltip from '@/ui/help-tooltip'
import { SIDEBAR_TRANSITION_CLASSNAMES } from '@/ui/primitives/sidebar'
import TemplatesHeader from './header'
import { useTemplateTableStore } from './stores/table-store'
import { TemplatesTableBody as TableBody } from './table-body'
import { fallbackData, templatesTableConfig, useColumns } from './table-config'

const PAGE_SIZE = 50

const COLUMN_TO_SORT_BASE: Record<string, string> = {
  name: 'name',
  cpuCount: 'cpu_count',
  memoryMB: 'memory_mb',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

export default function TemplatesTable() {
  'use no memo'

  const trpc = useTRPC()
  const { teamSlug } = useRouteParams<'/dashboard/[teamSlug]/templates'>()

  const { sorting, setSorting, globalFilter, setGlobalFilter } =
    useTemplateTableStore()
  const { cpuCount, memoryMB, isPublic } = useTemplateTableStore()

  // Derive the single server sort token from the active sort column + direction.
  const sortColumn = sorting[0]
  const sortBase =
    (sortColumn && COLUMN_TO_SORT_BASE[sortColumn.id]) ?? 'updated_at'
  const sort =
    `${sortBase}_${sortColumn?.desc === false ? 'asc' : 'desc'}` as TemplatesSort

  const {
    data,
    error: templatesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useSuspenseInfiniteQuery(
    trpc.templates.getTemplates.infiniteQueryOptions(
      {
        teamSlug,
        limit: PAGE_SIZE,
        cpuCount,
        memoryMB,
        public: isPublic,
        search: globalFilter || undefined,
        sort,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        initialCursor: undefined,
        placeholderData: keepPreviousData,
      }
    )
  )

  const templates = useMemo<Array<Template | DefaultTemplate>>(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data]
  )

  const { isRefetching, clearRefetching } = useTemplatesRefetchTracking(
    sort,
    globalFilter,
    cpuCount,
    memoryMB,
    isPublic
  )

  useEffect(() => {
    if (!isFetching && isRefetching) {
      clearRefetching()
    }
  }, [isFetching, isRefetching, clearRefetching])

  const isListDimmed = isRefetching && templates.length > 0

  const scrollRef = useRef<HTMLDivElement>(null)

  const [columnSizing, setColumnSizing] = useLocalStorage<ColumnSizingState>(
    'templates:columnSizing:v3',
    {},
    {
      deserializer: (value) => JSON.parse(value),
      serializer: (value) => JSON.stringify(value),
    }
  )

  const columns = useColumns([])

  const table = useReactTable<Template>({
    ...templatesTableConfig,
    data: templates ?? fallbackData,
    columns: columns ?? fallbackData,
    state: {
      globalFilter,
      sorting,
      columnSizing,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
  } as TableOptions<Template>)

  const columnSizeVars = useColumnSizeVars(table)

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll reset is triggered by query-input changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
      scrollRef.current.scrollLeft = 0
    }
  }, [sort, globalFilter, cpuCount, memoryMB, isPublic])

  if (templatesError) {
    return (
      <ErrorBoundary
        error={{
          name: 'Templates Error',
          message: templatesError?.message ?? 'Failed to load templates',
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
                    sorting={sorting.find((s) => s.id === header.id)?.desc}
                    align={
                      header.id === 'cpuCount' || header.id === 'memoryMB'
                        ? 'right'
                        : 'left'
                    }
                  >
                    {header.id === 'public' ? (
                      <HelpTooltip>
                        Public templates can be used by all users to start
                        Sandboxes, but can only be edited by your team. Internal
                        templates can only be used and edited by your team.
                      </HelpTooltip>
                    ) : null}
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
            templates={templates}
            table={table}
            scrollRef={scrollRef}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            isRefetching={isListDimmed}
          />
        </DataTable>
      </div>
    </ClientOnly>
  )
}

function useTemplatesRefetchTracking(
  sort: string,
  globalFilter: string,
  cpuCount: number | undefined,
  memoryMB: number | undefined,
  isPublic: boolean | undefined
) {
  const [isRefetching, setIsRefetching] = useState(false)
  const isFirstRender = useRef(true)

  // biome-ignore lint/correctness/useExhaustiveDependencies: these are change triggers, not values read in the effect
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setIsRefetching(true)
  }, [sort, globalFilter, cpuCount, memoryMB, isPublic])

  const clearRefetching = useCallback(() => setIsRefetching(false), [])

  return { isRefetching, clearRefetching }
}
