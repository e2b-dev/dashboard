'use client'

import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  type ColumnSizingState,
  flexRender,
  type TableOptions,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { PROTECTED_URLS } from '@/configs/urls'
import type {
  BuildStatus,
  ListedBuildModel,
  RunningBuildStatusModel,
} from '@/core/modules/builds/models'
import { useColumnSizeVars } from '@/lib/hooks/use-column-size-vars'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { cn } from '@/lib/utils'
import { useTRPC } from '@/trpc/client'
import {
  DataTable,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/ui/data-table'
import { BackToTopButton, LoadMoreButton } from '@/ui/pagination-buttons'
import { Loader } from '@/ui/primitives/loader'
import { SIDEBAR_TRANSITION_CLASSNAMES } from '@/ui/primitives/sidebar'
import BuildsEmpty from './empty'
import { BuildsTableBody } from './table-body'
import {
  buildsColumns,
  buildsTableConfig,
  DEFAULT_SORT_COLUMN_ID,
  fallbackData,
  ID_COLUMN_ID,
  isRightAlignedColumn,
} from './table-config'

const BUILDS_REFETCH_INTERVAL_MS = 15_000
const RUNNING_BUILD_POLL_INTERVAL_MS = 3_000
const MAX_CACHED_PAGES = 3

interface BuildsTableProps {
  filters: {
    statuses: BuildStatus[]
    buildIdOrTemplate?: string
  }
  // Client-side row filter applied after fetch + live-status merge.
  postFilter?: (build: ListedBuildModel) => boolean
  showTemplateColumn?: boolean
  disabled?: boolean
}

const BuildsTable = ({
  filters,
  postFilter,
  showTemplateColumn = true,
  disabled = false,
}: BuildsTableProps) => {
  'use no memo'

  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const router = useRouter()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { teamSlug } = useRouteParams<'/dashboard/[teamSlug]/templates'>()
  const [columnSizing, setColumnSizing] = useLocalStorage<ColumnSizingState>(
    'builds:columnSizing:v1',
    {},
    {
      deserializer: (value) => JSON.parse(value),
      serializer: (value) => JSON.stringify(value),
    }
  )

  const { statuses, buildIdOrTemplate } = filters
  const { isFilterRefetching, clearFilterRefetching } = useFilterChangeTracking(
    statuses,
    buildIdOrTemplate
  )

  const columnVisibility = useMemo<VisibilityState>(
    () => ({ template: showTemplateColumn }),
    [showTemplateColumn]
  )

  const queryInput = {
    teamSlug,
    statuses,
    buildIdOrTemplate,
  }

  // Builds list query
  const {
    data: paginatedBuilds,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching: isFetchingBuilds,
    isPending: isInitialLoad,
    error: buildsError,
  } = useInfiniteQuery(
    trpc.builds.list.infiniteQueryOptions(queryInput, {
      getNextPageParam: (page) => page.nextCursor ?? undefined,
      placeholderData: keepPreviousData,
      retry: 3,
      refetchInterval: BUILDS_REFETCH_INTERVAL_MS,
      refetchIntervalInBackground: false,
      maxPages: MAX_CACHED_PAGES,
      enabled: !disabled,
    })
  )

  const builds = useMemo(
    () => paginatedBuilds?.pages.flatMap((p) => p.data) ?? [],
    [paginatedBuilds]
  )

  const hasScrolledPastInitialPages =
    paginatedBuilds?.pageParams[0] !== undefined

  useEffect(() => {
    if (!isFetchingBuilds && isFilterRefetching) {
      clearFilterRefetching()
    }
  }, [isFetchingBuilds, isFilterRefetching, clearFilterRefetching])

  useEffect(() => {
    if (disabled) clearFilterRefetching()
  }, [disabled, clearFilterRefetching])

  // Running builds status polling
  const runningBuildIds = useMemo(
    () => builds.filter((b) => b.status === 'building').map((b) => b.id),
    [builds]
  )

  const { data: runningStatusesData } = useQuery(
    trpc.builds.runningStatuses.queryOptions(
      { teamSlug, buildIds: runningBuildIds },
      {
        enabled: runningBuildIds.length > 0,
        refetchInterval: (query) => {
          const hasRunningBuilds = query.state.data?.some(
            (s) => s.status === 'building'
          )
          return hasRunningBuilds ? RUNNING_BUILD_POLL_INTERVAL_MS : false
        },
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: 'always',
        retry: false,
      }
    )
  )

  const buildsWithLiveStatus = useMemo(
    () => mergeBuildsWithLiveStatuses(builds, runningStatusesData),
    [builds, runningStatusesData]
  )

  const visibleBuilds = useMemo(
    () =>
      postFilter
        ? buildsWithLiveStatus.filter(postFilter)
        : buildsWithLiveStatus,
    [buildsWithLiveStatus, postFilter]
  )

  const table = useReactTable<ListedBuildModel>({
    ...buildsTableConfig,
    data: visibleBuilds ?? fallbackData,
    columns: buildsColumns,
    state: {
      columnSizing,
      columnVisibility,
    },
    onColumnSizingChange: setColumnSizing,
  } as TableOptions<ListedBuildModel>)

  const columnSizeVars = useColumnSizeVars(table)

  // Handlers
  const buildsQueryKey =
    trpc.builds.list.infiniteQueryOptions(queryInput).queryKey

  const handleLoadMore = useCallback(() => {
    fetchNextPage()
  }, [fetchNextPage])

  const handleBackToTop = useCallback(() => {
    queryClient.resetQueries({ queryKey: buildsQueryKey })
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [queryClient, buildsQueryKey])

  // Reset scroll when the query inputs change.
  // biome-ignore lint/correctness/useExhaustiveDependencies: these are change triggers, not values read in the effect
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [statuses, buildIdOrTemplate])

  // Derived UI state
  const hasData = !disabled && visibleBuilds.length > 0
  const showLoader = !disabled && isInitialLoad && !hasData
  const showEmpty =
    disabled || (!isInitialLoad && !isFetchingBuilds && !hasData)
  const showFilterRefetchingOverlay = isFilterRefetching && hasData

  return (
    <div
      className={cn(
        'flex-1 min-h-0 -mx-3 md:-mx-6 overflow-x-auto md:max-w-[calc(100svw-var(--sidebar-width-active))]',
        SIDEBAR_TRANSITION_CLASSNAMES
      )}
    >
      <DataTable
        ref={scrollContainerRef}
        className={cn(
          'h-full overflow-y-auto px-3 md:px-6 md:min-w-[calc(100svw-var(--sidebar-width-active))]',
          SIDEBAR_TRANSITION_CLASSNAMES
        )}
        style={{ ...columnSizeVars }}
      >
        <DataTableHeader className="sticky top-0 z-30 bg-bg">
          {table.getHeaderGroups().map((headerGroup) => (
            <DataTableRow
              key={headerGroup.id}
              className="border-b-0 -mx-2 px-2 w-[calc(100%+16px)] gap-8"
            >
              {headerGroup.headers.map((header) => (
                <DataTableHead
                  key={header.id}
                  header={header}
                  className={cn(
                    'shrink-0',
                    header.id === ID_COLUMN_ID && 'pl-4'
                  )}
                  align={isRightAlignedColumn(header.id) ? 'right' : 'left'}
                  sorting={
                    header.id === DEFAULT_SORT_COLUMN_ID ? true : undefined
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

        {showLoader && (
          <div className="h-[35svh] w-full flex justify-center items-center">
            <Loader variant="slash" size="lg" />
          </div>
        )}

        {showEmpty && <BuildsEmpty error={buildsError?.message} />}

        {hasData && (
          <div
            className={
              showFilterRefetchingOverlay ? 'opacity-70 transition-opacity' : ''
            }
          >
            {hasScrolledPastInitialPages && (
              <div className="py-2 text-center text-fg-tertiary">
                <BackToTopButton onBackToTop={handleBackToTop} />
              </div>
            )}

            <BuildsTableBody
              table={table}
              scrollRef={scrollContainerRef}
              onRowClick={(build) =>
                router.push(
                  PROTECTED_URLS.TEMPLATE_BUILD(
                    teamSlug,
                    build.templateId,
                    build.id
                  )
                )
              }
            />

            {hasNextPage && (
              <div className="py-2 text-center text-fg-tertiary">
                <LoadMoreButton
                  isLoading={isFetchingNextPage}
                  onLoadMore={handleLoadMore}
                />
              </div>
            )}
          </div>
        )}
      </DataTable>
    </div>
  )
}

export default BuildsTable

function useFilterChangeTracking(
  statuses: string[],
  buildIdOrTemplate: string | undefined
) {
  const [isFilterRefetching, setIsFilterRefetching] = useState(false)
  const isFirstRender = useRef(true)

  // biome-ignore lint/correctness/useExhaustiveDependencies: these are change triggers, not values read in the effect
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setIsFilterRefetching(true)
  }, [statuses, buildIdOrTemplate])

  const clearFilterRefetching = useCallback(() => {
    setIsFilterRefetching(false)
  }, [])

  return { isFilterRefetching, clearFilterRefetching }
}

function mergeBuildsWithLiveStatuses(
  builds: ListedBuildModel[],
  runningStatusesData: RunningBuildStatusModel[] | undefined
): ListedBuildModel[] {
  if (!runningStatusesData || runningStatusesData.length === 0) return builds

  const statusMap = new Map(runningStatusesData.map((s) => [s.id, s]))

  return builds.map((build) => {
    const updated = statusMap.get(build.id)
    if (updated) {
      return {
        ...build,
        status: updated.status,
        finishedAt: updated.finishedAt,
        statusMessage: updated.statusMessage,
      }
    }
    return build
  })
}
