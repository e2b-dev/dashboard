'use client'

import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import type {
  BuildStatus,
  ListedBuildModel,
  RunningBuildStatusModel,
} from '@/core/modules/builds/models'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { cn } from '@/lib/utils/ui'
import { useTRPC } from '@/trpc/client'
import { ArrowDownIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'
import BuildsEmpty from './empty'
import {
  BackToTopButton,
  BuildId,
  Duration,
  LoadMoreButton,
  Reason,
  StartedAt,
  Status,
  Template,
} from './table-cells'

const BUILDS_REFETCH_INTERVAL_MS = 15_000
const RUNNING_BUILD_POLL_INTERVAL_MS = 3_000
const MAX_CACHED_PAGES = 3

const COLUMN_WIDTHS = {
  id: 168,
  status: 96,
  template: 192,
  started: 126,
  duration: 96,
} as const

interface BuildsTableProps {
  // Pre-resolved filter values; the table is hook-source agnostic.
  filters: {
    statuses: BuildStatus[]
    buildIdOrTemplate?: string
  }
  // Optional client-side row filter applied after fetch + live-status merge.
  postFilter?: (build: ListedBuildModel) => boolean
  // Whether to render the Template column. Default true.
  showTemplateColumn?: boolean
}

const BuildsTable = ({
  filters,
  postFilter,
  showTemplateColumn = true,
}: BuildsTableProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const router = useRouter()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { teamSlug } = useRouteParams<'/dashboard/[teamSlug]/templates'>()

  const { statuses, buildIdOrTemplate } = filters
  const { isFilterRefetching, clearFilterRefetching } = useFilterChangeTracking(
    statuses,
    buildIdOrTemplate
  )

  const {
    data: paginatedBuilds,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching: isFetchingBuilds,
    isPending: isInitialLoad,
    error: buildsError,
  } = useInfiniteQuery(
    trpc.builds.list.infiniteQueryOptions(
      { teamSlug, statuses, buildIdOrTemplate },
      {
        getNextPageParam: (page) => page.nextCursor ?? undefined,
        placeholderData: keepPreviousData,
        retry: 3,
        refetchInterval: BUILDS_REFETCH_INTERVAL_MS,
        refetchIntervalInBackground: false,
        maxPages: MAX_CACHED_PAGES,
      }
    )
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

  // Optional client-side row filter from the caller. The backend query
  // is the source of truth for which builds belong to this table; the
  // postFilter only narrows the already-loaded pages.
  const visibleBuilds = useMemo(() => {
    if (!postFilter) return buildsWithLiveStatus
    return buildsWithLiveStatus.filter(postFilter)
  }, [buildsWithLiveStatus, postFilter])

  const buildsQueryKey = trpc.builds.list.infiniteQueryOptions({
    teamSlug,
    statuses,
    buildIdOrTemplate,
  }).queryKey

  const handleLoadMore = useCallback(() => {
    fetchNextPage()
  }, [fetchNextPage])

  const handleBackToTop = useCallback(() => {
    queryClient.resetQueries({ queryKey: buildsQueryKey })
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [queryClient, buildsQueryKey])

  const hasData = visibleBuilds.length > 0
  const showLoader = isInitialLoad && !hasData
  const showEmpty = !isInitialLoad && !isFetchingBuilds && !hasData
  const showFilterRefetchingOverlay = isFilterRefetching && hasData

  const visibleColumnCount = showTemplateColumn ? 6 : 5

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden relative">
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-auto lg:overflow-x-hidden"
      >
        <Table suppressHydrationWarning>
          <colgroup>
            <col style={colStyle(COLUMN_WIDTHS.status)} />
            <col style={colStyle(COLUMN_WIDTHS.id)} />
            {showTemplateColumn && (
              <col style={colStyle(COLUMN_WIDTHS.template)} />
            )}
            <col style={colStyle(COLUMN_WIDTHS.started)} />
            <col style={colStyle(COLUMN_WIDTHS.duration)} />
            <col className="max-lg:min-w-[500px]" />
          </colgroup>

          <TableHeader className="sticky top-0 z-10 bg-bg">
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>ID</TableHead>
              {showTemplateColumn && <TableHead>Template</TableHead>}
              <TableHead>
                <span className="inline-flex items-center gap-1 text-fg">
                  Started
                  <ArrowDownIcon className="size-3" />
                </span>
              </TableHead>
              <TableHead className="text-end">Duration</TableHead>
              <th />
            </TableRow>
          </TableHeader>

          <TableBody
            className={
              showFilterRefetchingOverlay ? 'opacity-70 transition-opacity' : ''
            }
          >
            {showLoader && (
              <TableRow>
                <TableCell colSpan={visibleColumnCount}>
                  <div className="h-[35svh] w-full flex justify-center items-center">
                    <Loader variant="slash" size="lg" />
                  </div>
                </TableCell>
              </TableRow>
            )}

            {showEmpty && (
              <TableRow>
                <TableCell colSpan={visibleColumnCount}>
                  <BuildsEmpty error={buildsError?.message} />
                </TableCell>
              </TableRow>
            )}

            {hasData && (
              <>
                {hasScrolledPastInitialPages && (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumnCount}
                      className="text-center max-lg:text-start text-fg-tertiary"
                    >
                      <BackToTopButton onBackToTop={handleBackToTop} />
                    </TableCell>
                  </TableRow>
                )}

                {visibleBuilds.map((build) => {
                  const isBuilding = build.status === 'building'

                  return (
                    <TableRow
                      key={build.id}
                      className={cn(
                        'transition-colors cursor-pointer hover:bg-bg-hover',
                        {
                          'bg-bg-1 animate-pulse': isBuilding,
                        }
                      )}
                      onClick={() => {
                        router.push(
                          PROTECTED_URLS.TEMPLATE_BUILD(
                            teamSlug,
                            build.templateId,
                            build.id
                          )
                        )
                      }}
                    >
                      <TableCell
                        className="py-1.5"
                        style={{ maxWidth: COLUMN_WIDTHS.status }}
                      >
                        <Status status={build.status} />
                      </TableCell>
                      <TableCell
                        className="py-1.5 overflow-hidden"
                        style={{ maxWidth: COLUMN_WIDTHS.id }}
                      >
                        <BuildId id={build.id} />
                      </TableCell>
                      {showTemplateColumn && (
                        <TableCell
                          className="py-1.5 overflow-hidden"
                          style={{ maxWidth: COLUMN_WIDTHS.template }}
                        >
                          <Template
                            template={build.template}
                            templateId={build.templateId}
                          />
                        </TableCell>
                      )}
                      <TableCell className="py-1.5">
                        <StartedAt timestamp={build.createdAt} />
                      </TableCell>
                      <TableCell className="py-1.5 text-end">
                        <Duration
                          createdAt={build.createdAt}
                          finishedAt={build.finishedAt}
                          isBuilding={isBuilding}
                        />
                      </TableCell>
                      <TableCell className="py-1.5 w-full">
                        <Reason statusMessage={build.statusMessage} />
                      </TableCell>
                    </TableRow>
                  )
                })}

                {hasNextPage && (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumnCount}
                      className="text-center max-lg:text-start text-fg-tertiary"
                    >
                      <LoadMoreButton
                        isLoading={isFetchingNextPage}
                        onLoadMore={handleLoadMore}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default BuildsTable

function colStyle(width: number) {
  return { width, minWidth: width, maxWidth: width }
}

function useFilterChangeTracking(
  statuses: string[],
  buildIdOrTemplate: string | undefined
) {
  const [isFilterRefetching, setIsFilterRefetching] = useState(false)
  const isFirstRender = useRef(true)

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
