'use client'

import type {
  ListedBuildDTO,
  RunningBuildStatusDTO,
} from '@/server/api/models/builds.models'
import { useTRPC } from '@/trpc/client'
import { Loader } from '@/ui/primitives/loader'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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
import useFilters from './use-filters'

const BUILDS_REFETCH_INTERVAL_MS = 15_000
const RUNNING_BUILD_POLL_INTERVAL_MS = 3_000
const MAX_CACHED_PAGES = 3

const COLUMN_WIDTHS = {
  id: 132,
  status: 96,
  template: 192,
  started: 156,
  duration: 96,
} as const

const BuildsTable = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { teamIdOrSlug } =
    useParams<
      Awaited<PageProps<'/dashboard/[teamIdOrSlug]/templates'>['params']>
    >()
  const { statuses, buildIdOrTemplate } = useFilters()
  const { isFilterRefetching, clearFilterRefetching } = useFilterChangeTracking(
    statuses,
    buildIdOrTemplate
  )

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
    trpc.builds.list.infiniteQueryOptions(
      { teamIdOrSlug, statuses, buildIdOrTemplate },
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

  // Running builds status polling
  const runningBuildIds = useMemo(
    () => builds.filter((b) => b.status === 'building').map((b) => b.id),
    [builds]
  )

  const { data: runningStatusesData } = useQuery(
    trpc.builds.runningStatuses.queryOptions(
      { teamIdOrSlug, buildIds: runningBuildIds },
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

  // Handlers
  const buildsQueryKey = trpc.builds.list.infiniteQueryOptions({
    teamIdOrSlug,
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

  // Derived UI state
  const hasData = buildsWithLiveStatus.length > 0
  const showLoader = isInitialLoad && !hasData
  const showEmpty = !isInitialLoad && !isFetchingBuilds && !hasData
  const showFilterRefetchingOverlay =
    isFilterRefetching && isFetchingBuilds && hasData

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden relative">
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-auto md:overflow-x-hidden"
      >
        <Table suppressHydrationWarning>
          <colgroup>
            <col style={colStyle(COLUMN_WIDTHS.id)} />
            <col style={colStyle(COLUMN_WIDTHS.status)} />
            <col style={colStyle(COLUMN_WIDTHS.template)} />
            <col style={colStyle(COLUMN_WIDTHS.started)} />
            <col style={colStyle(COLUMN_WIDTHS.duration)} />
            <col />
          </colgroup>

          <TableHeader className="sticky top-0 z-10 bg-bg">
            <TableRow>
              <TableHead>Build ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Template</TableHead>
              <TableHead className="text-end">Started</TableHead>
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
                <TableCell colSpan={6}>
                  <div className="h-[35svh] w-full flex justify-center items-center">
                    <Loader variant="slash" size="lg" />
                  </div>
                </TableCell>
              </TableRow>
            )}

            {showEmpty && (
              <TableRow>
                <TableCell colSpan={6}>
                  <BuildsEmpty error={buildsError?.message} />
                </TableCell>
              </TableRow>
            )}

            {hasData && (
              <>
                {hasScrolledPastInitialPages && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-start text-fg-tertiary"
                    >
                      <BackToTopButton onBackToTop={handleBackToTop} />
                    </TableCell>
                  </TableRow>
                )}

                {buildsWithLiveStatus.map((build) => {
                  const isBuilding = build.status === 'building'

                  return (
                    <TableRow
                      key={build.id}
                      className={isBuilding ? 'bg-bg-1 animate-pulse' : ''}
                    >
                      <TableCell
                        className="py-1.5 overflow-hidden"
                        style={{ maxWidth: COLUMN_WIDTHS.id }}
                      >
                        <BuildId id={build.id} />
                      </TableCell>
                      <TableCell
                        className="py-1.5"
                        style={{ maxWidth: COLUMN_WIDTHS.status }}
                      >
                        <Status status={build.status} />
                      </TableCell>
                      <TableCell
                        className="py-1.5 overflow-hidden"
                        style={{ maxWidth: COLUMN_WIDTHS.template }}
                      >
                        <Template
                          name={build.template}
                          templateId={build.template}
                        />
                      </TableCell>
                      <TableCell className="py-1.5 text-end">
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
                      colSpan={6}
                      className="text-start text-fg-tertiary"
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
  builds: ListedBuildDTO[],
  runningStatusesData: RunningBuildStatusDTO[] | undefined
): ListedBuildDTO[] {
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
