'use client'

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

const BUILDS_REFETCH_INTERVAL = 15_000
const RUNNING_STATUS_INTERVAL = 3_000

const COLUMN_WIDTHS = {
  id: 132,
  status: 96,
  template: 192,
  started: 156,
  duration: 96,
} as const

const colStyle = (width: number) => ({
  width,
  minWidth: width,
  maxWidth: width,
})

const BuildsTable = () => {
  const trpc = useTRPC()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isFilterRefetching, setIsFilterRefetching] = useState(false)
  const { teamIdOrSlug } =
    useParams<
      Awaited<PageProps<'/dashboard/[teamIdOrSlug]/templates'>['params']>
    >()
  const { statuses, buildIdOrTemplate } = useFilters()

  // track filter changes to show loading state only for user-initiated refetches
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setIsFilterRefetching(true)
  }, [statuses, buildIdOrTemplate])

  // paginated query for builds with periodic refetch
  const {
    data: paginatedBuilds,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching: isFetchingBuilds,
    isPending: isInitialLoad,
    error: buildsError,
    refetch,
  } = useInfiniteQuery(
    trpc.builds.list.infiniteQueryOptions(
      { teamIdOrSlug, statuses, buildIdOrTemplate },
      {
        getNextPageParam: (page) => page.nextCursor ?? undefined,
        placeholderData: keepPreviousData,
        retry: 3,
        refetchInterval: BUILDS_REFETCH_INTERVAL,
        refetchIntervalInBackground: false,
        maxPages: 3,
      }
    )
  )

  // Show "Back to top" when the initial page has been dropped due to maxPages
  // This happens when the first pageParam is not undefined (meaning we've scrolled past the beginning)
  const firstPageParam = paginatedBuilds?.pageParams[0]
  const showBackToTop = firstPageParam !== undefined

  const builds = useMemo(
    () => paginatedBuilds?.pages.flatMap((p) => p.data) ?? [],
    [paginatedBuilds]
  )

  // reset filter refetching state when fetch completes
  useEffect(() => {
    if (!isFetchingBuilds && isFilterRefetching) {
      setIsFilterRefetching(false)
    }
  }, [isFetchingBuilds, isFilterRefetching])

  const buildingIdsFromList = useMemo(
    () => builds.filter((b) => b.status === 'building').map((b) => b.id),
    [builds]
  )

  // poll to check running builds for status updates (errors ignored)
  const { data: runningStatusesData } = useQuery(
    trpc.builds.runningStatuses.queryOptions(
      { teamIdOrSlug, buildIds: buildingIdsFromList },
      {
        enabled: buildingIdsFromList.length > 0,
        refetchInterval: (query) => {
          const data = query.state.data
          if (!data) return RUNNING_STATUS_INTERVAL
          const hasRunning = data.some((s) => s.status === 'building')
          return hasRunning ? RUNNING_STATUS_INTERVAL : false
        },
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: 'always',
        retry: false,
      }
    )
  )

  // merge live status updates
  const buildsWithLiveStatus = useMemo(() => {
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
  }, [builds, runningStatusesData])

  // UI state
  const hasData = buildsWithLiveStatus.length > 0
  const showLoader = isInitialLoad && !hasData
  const showEmpty = !isInitialLoad && !isFetchingBuilds && !hasData
  const showFilterRefetchingOverlay =
    isFilterRefetching && isFetchingBuilds && hasData

  const handleLoadMore = useCallback(() => {
    fetchNextPage()
  }, [fetchNextPage])

  const handleBackToTop = useCallback(() => {
    refetch()
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [refetch])

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
                {showBackToTop && (
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
