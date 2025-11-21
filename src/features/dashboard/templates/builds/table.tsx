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
import { useEffect, useMemo, useRef } from 'react'
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
import useFiters from './use-filters'

const ACTIVE_PULSE_INTERVAL = 3_000
const IDLE_PULSE_INTERVAL = 10_000
const ROW_HEIGHT = 37

const BuildsTable = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const parentRef = useRef<HTMLDivElement>(null)
  const lastSeenBuildAtRef = useRef<number | null>(null)
  const { teamIdOrSlug } =
    useParams<
      Awaited<PageProps<'/dashboard/[teamIdOrSlug]/templates'>['params']>
    >()

  const { statuses, buildIdOrTemplate } = useFiters()

  useEffect(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = 0
    }
  }, [statuses, buildIdOrTemplate])

  const {
    data: builds,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching: isFetchingList,
    isPending,
    error: listError,
  } = useInfiniteQuery(
    trpc.builds.list.infiniteQueryOptions(
      {
        teamIdOrSlug,
        statuses,
        buildIdOrTemplate,
      },
      {
        getNextPageParam: (page) => page.nextCursor,
        placeholderData: (prev) => prev,
      }
    )
  )

  const allBuilds = useMemo(
    () => builds?.pages.flatMap((p) => p.data) ?? [],
    [builds]
  )

  const hasRunningBuilds = useMemo(
    () => allBuilds.some((b) => b.status === 'building'),
    [allBuilds]
  )

  const pulseInterval = hasRunningBuilds
    ? ACTIVE_PULSE_INTERVAL
    : IDLE_PULSE_INTERVAL

  const { data: pulseData } = useQuery(
    trpc.builds.pulse.queryOptions(
      { teamIdOrSlug },
      {
        refetchInterval: pulseInterval,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        refetchOnMount: 'always',
      }
    )
  )

  // handle pulse updates
  useEffect(() => {
    if (!pulseData || isFetchingList) return

    const { latestBuildAt, recentlyCompleted } = pulseData

    const listQueryKey = trpc.builds.list.infiniteQueryOptions({
      teamIdOrSlug,
      buildIdOrTemplate,
      statuses,
    }).queryKey

    // detect new builds - invalidate to fetch them
    if (
      latestBuildAt !== null &&
      lastSeenBuildAtRef.current !== null &&
      latestBuildAt > lastSeenBuildAtRef.current
    ) {
      queryClient.invalidateQueries({ queryKey: listQueryKey })
    }

    // update completed builds directly in cache
    if (recentlyCompleted.length > 0) {
      queryClient.setQueryData(listQueryKey, (old) => {
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

    lastSeenBuildAtRef.current = latestBuildAt
  }, [
    pulseData,
    queryClient,
    trpc,
    teamIdOrSlug,
    statuses,
    buildIdOrTemplate,
    isFetchingList,
  ])

  const buildsWithUpdatedStatuses = useMemo(() => {
    if (!pulseData?.runningStatuses) return allBuilds

    const statusMap = new Map(
      pulseData.runningStatuses.map((s) => [s.id, s.status])
    )

    return allBuilds.map((build) => {
      const updatedStatus = statusMap.get(build.id)
      if (updatedStatus && updatedStatus !== build.status) {
        return { ...build, status: updatedStatus }
      }
      return build
    })
  }, [allBuilds, pulseData])

  const rowCount = hasNextPage
    ? buildsWithUpdatedStatuses.length + 1
    : buildsWithUpdatedStatuses.length

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  const paddingTop = virtualItems.length > 0 ? (virtualItems[0]?.start ?? 0) : 0
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() -
        (virtualItems[virtualItems.length - 1]?.end ?? 0)
      : 0

  const hasData = buildsWithUpdatedStatuses.length > 0
  const showInitialLoader = isPending && !hasData
  const showEmpty = !isPending && !hasData
  const showData = hasData

  const idWidth = 96
  const templateWidth = 192
  const startedWidth = 156
  const durationWidth = 96
  const statusWidth = 96

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div
        ref={parentRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-auto"
      >
        <Table suppressHydrationWarning>
          <colgroup>
            {/* inline styles to avoid server/client boundary layout shifts */}
            <col
              style={{ width: idWidth, minWidth: idWidth, maxWidth: idWidth }}
            />
            <col
              style={{
                width: statusWidth,
                minWidth: statusWidth,
                maxWidth: statusWidth,
              }}
            />
            <col
              style={{
                width: templateWidth,
                minWidth: templateWidth,
                maxWidth: templateWidth,
              }}
            />
            <col
              style={{
                width: startedWidth,
                minWidth: startedWidth,
                maxWidth: startedWidth,
              }}
            />
            <col
              style={{
                width: durationWidth,
                minWidth: durationWidth,
                maxWidth: durationWidth,
              }}
            />
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
          <TableBody>
            {showInitialLoader && (
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
                  <BuildsEmpty error={listError?.message} />
                </TableCell>
              </TableRow>
            )}

            {showData && (
              <>
                {paddingTop > 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ height: paddingTop, padding: 0 }}
                    />
                  </tr>
                )}

                {virtualItems.map((virtualRow) => {
                  const isLoaderRow =
                    virtualRow.index > buildsWithUpdatedStatuses.length - 1
                  const build = buildsWithUpdatedStatuses[virtualRow.index]

                  if (isLoaderRow) {
                    return (
                      <TableRow key="loader">
                        <TableCell
                          colSpan={6}
                          className="text-start text-fg-tertiary"
                        >
                          <LoadMoreButton
                            isLoading={isFetchingNextPage}
                            onLoadMore={() => fetchNextPage()}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  }

                  if (!build) return null

                  return (
                    <TableRow key={build.id}>
                      <TableCell className="py-1.5">
                        <BuildId shortId={build.shortId} />
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Status status={build.status} />
                      </TableCell>
                      <TableCell
                        className="py-1.5 overflow-hidden"
                        style={{ maxWidth: templateWidth }}
                      >
                        <Template name={build.template} />
                      </TableCell>
                      <TableCell className="py-1.5">
                        <StartedAt timestamp={build.createdAt} />
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Duration
                          createdAt={build.createdAt}
                          finishedAt={build.finishedAt}
                          isBuilding={build.status === 'building'}
                        />
                      </TableCell>
                      <TableCell className="py-1.5 overflow-hidden">
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
