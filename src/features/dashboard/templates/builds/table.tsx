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
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import BuildsEmpty from './empty'
import {
  BuildId,
  Duration,
  LoadMoreButton,
  Reason,
  StartedAt,
  Status,
  Template,
} from './table-cells'
import useFilters from './use-filters'

const PULSE_INTERVAL_ACTIVE = 3_000
const PULSE_INTERVAL_IDLE = 10_000
const ROW_HEIGHT = 37
const OVERSCAN = 10

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
  const queryClient = useQueryClient()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastKnownBuildTimestamp = useRef<number | null>(null)

  const { teamIdOrSlug } =
    useParams<
      Awaited<PageProps<'/dashboard/[teamIdOrSlug]/templates'>['params']>
    >()
  const { statuses, buildIdOrTemplate } = useFilters()

  // reset scroll when filters change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [statuses, buildIdOrTemplate])

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
        getNextPageParam: (page) => page.nextCursor,
        placeholderData: (prev) => prev,
      }
    )
  )

  const builds = useMemo(
    () => paginatedBuilds?.pages.flatMap((p) => p.data) ?? [],
    [paginatedBuilds]
  )

  // determine pulse frequency based on active builds
  const hasActiveBuilds = useMemo(
    () => builds.some((b) => b.status === 'building'),
    [builds]
  )

  const pulseInterval = hasActiveBuilds
    ? PULSE_INTERVAL_ACTIVE
    : PULSE_INTERVAL_IDLE

  // poll for build status updates
  const { data: pulseData } = useQuery(
    trpc.builds.pulse.queryOptions(
      { teamIdOrSlug },
      {
        refetchInterval: pulseInterval,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: 'always',
        refetchOnMount: 'always',
      }
    )
  )

  // query key for cache updates
  const buildsQueryKey = useMemo(
    () =>
      trpc.builds.list.infiniteQueryOptions({
        teamIdOrSlug,
        buildIdOrTemplate,
        statuses,
      }).queryKey,
    [trpc, teamIdOrSlug, buildIdOrTemplate, statuses]
  )

  // sync pulse data with builds cache
  useEffect(() => {
    if (!pulseData || isFetchingBuilds) return

    const { latestBuildAt, recentlyCompleted } = pulseData

    // invalidate if new builds detected
    if (
      latestBuildAt !== null &&
      lastKnownBuildTimestamp.current !== null &&
      latestBuildAt > lastKnownBuildTimestamp.current
    ) {
      queryClient.invalidateQueries({ queryKey: buildsQueryKey })
    }

    // update completed builds in cache
    if (recentlyCompleted.length > 0) {
      queryClient.setQueryData(buildsQueryKey, (old) => {
        if (!old) return old

        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((build) => {
              const completed = recentlyCompleted.find((c) => c.id === build.id)
              if (completed) {
                return {
                  ...build,
                  status: completed.status,
                  finishedAt: completed.finishedAt,
                  statusMessage: completed.statusMessage,
                }
              }
              return build
            }),
          })),
        }
      })
    }

    lastKnownBuildTimestamp.current = latestBuildAt
  }, [pulseData, queryClient, buildsQueryKey, isFetchingBuilds])

  // merge live status updates from pulse
  const buildsWithLiveStatus = useMemo(() => {
    if (!pulseData?.runningStatuses) return builds

    const liveStatusMap = new Map(
      pulseData.runningStatuses.map((s) => [s.id, s.status])
    )

    return builds.map((build) => {
      const liveStatus = liveStatusMap.get(build.id)
      if (liveStatus && liveStatus !== build.status) {
        return { ...build, status: liveStatus }
      }
      return build
    })
  }, [builds, pulseData])

  // virtualization
  const rowCount = hasNextPage
    ? buildsWithLiveStatus.length + 1
    : buildsWithLiveStatus.length

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  })

  const virtualRows = virtualizer.getVirtualItems()

  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0
  const paddingBottom =
    virtualRows.length > 0
      ? virtualizer.getTotalSize() -
        (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0

  // UI state
  const hasData = buildsWithLiveStatus.length > 0
  const showLoader = isInitialLoad && !hasData
  const showEmpty = !isInitialLoad && !isFetchingBuilds && !hasData
  const isRefetching = isFetchingBuilds && hasData && !isFetchingNextPage

  const handleLoadMore = useCallback(() => {
    fetchNextPage()
  }, [fetchNextPage])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
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
              <TableHead>Started</TableHead>
              <TableHead>Duration</TableHead>
              <th />
            </TableRow>
          </TableHeader>
          <TableBody
            className={isRefetching ? 'opacity-70 transition-opacity' : ''}
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
                {paddingTop > 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ height: paddingTop, padding: 0 }}
                    />
                  </tr>
                )}

                {virtualRows.map((virtualRow) => {
                  const isLoadMoreRow =
                    virtualRow.index > buildsWithLiveStatus.length - 1
                  const build = buildsWithLiveStatus[virtualRow.index]

                  if (isLoadMoreRow) {
                    return (
                      <TableRow key="load-more">
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
                    )
                  }

                  if (!build) return null

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
                      <TableCell className="py-1.5">
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
                      <TableCell className="py-1.5">
                        <StartedAt timestamp={build.createdAt} />
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Duration
                          createdAt={build.createdAt}
                          finishedAt={build.finishedAt}
                          isBuilding={isBuilding}
                        />
                      </TableCell>
                      <TableCell className="py-1.5 overflow-hidden max-w-full">
                        <Reason statusMessage={build.statusMessage} />
                      </TableCell>
                    </TableRow>
                  )
                })}

                {paddingBottom > 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ height: paddingBottom, padding: 0 }}
                    />
                  </tr>
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
