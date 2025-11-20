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
  CreatedAt,
  Duration,
  LoadingIndicator,
  Status,
  Template,
} from './table-cells'
import useFiters from './use-filters'

const RUNNING_BUILDS_REFETCH_INTERVAL = 5 * 1000
const ROW_HEIGHT = 37

const BuildsTable = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const parentRef = useRef<HTMLDivElement>(null)
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

  const runningBuildIds = useMemo(
    () => allBuilds.filter((b) => b.status === 'building').map((b) => b.id),
    [allBuilds]
  )

  const { data: statusesData } = useQuery(
    trpc.builds.getStatuses.queryOptions(
      {
        teamIdOrSlug,
        buildIds: runningBuildIds,
      },
      {
        refetchInterval:
          runningBuildIds.length > 0 ? RUNNING_BUILDS_REFETCH_INTERVAL : false,
        enabled: runningBuildIds.length > 0,
      }
    )
  )

  // invalidate list when statuses have changed
  useEffect(() => {
    if (!statusesData?.statuses || isFetchingList) return

    const completedBuildIds = statusesData.statuses
      .filter((s) => s.status === 'success' || s.status === 'failed')
      .map((s) => s.id)

    if (completedBuildIds.length > 0) {
      queryClient.invalidateQueries({
        queryKey: trpc.builds.list.infiniteQueryOptions({
          teamIdOrSlug,
          buildIdOrTemplate,
          statuses,
        }).queryKey,
      })
    }
  }, [
    statusesData,
    queryClient,
    trpc,
    teamIdOrSlug,
    statuses,
    buildIdOrTemplate,
    isFetchingList,
  ])

  const buildsWithUpdatedStatuses = useMemo(() => {
    if (!statusesData?.statuses) return allBuilds

    const statusMap = new Map(
      statusesData.statuses.map((s) => [s.id, s.status])
    )

    return allBuilds.map((build) => {
      const updatedStatus = statusMap.get(build.id)
      if (updatedStatus && updatedStatus !== build.status) {
        return { ...build, status: updatedStatus }
      }
      return build
    })
  }, [allBuilds, statusesData])

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

  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1]

    if (!lastItem) return

    if (
      lastItem.index >= buildsWithUpdatedStatuses.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      const timeoutId = setTimeout(() => {
        fetchNextPage()
      }, 500)

      return () => clearTimeout(timeoutId)
    }
  }, [
    hasNextPage,
    fetchNextPage,
    buildsWithUpdatedStatuses.length,
    isFetchingNextPage,
    virtualItems,
  ])

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
  const isRefetching = isFetchingList && hasData

  const idWidth = 96
  const templateWidth = 192
  const startedWidth = 128
  const durationWidth = 96

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div
        ref={parentRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
      >
        <Table suppressHydrationWarning>
          <colgroup>
            {/* inline styles to avoid server/client boundary layout shifts */}
            <col
              style={{ width: idWidth, minWidth: idWidth, maxWidth: idWidth }}
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
              <TableHead>Template</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody
            className={isRefetching ? 'opacity-50 transition-opacity' : ''}
          >
            {showInitialLoader && (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="h-[35vh] w-full flex justify-center items-center">
                    <Loader variant="slash" size="lg" />
                  </div>
                </TableCell>
              </TableRow>
            )}

            {showEmpty && (
              <TableRow>
                <TableCell colSpan={5}>
                  <BuildsEmpty error={listError?.message} />
                </TableCell>
              </TableRow>
            )}

            {showData && (
              <>
                {paddingTop > 0 && (
                  <tr>
                    <td
                      colSpan={5}
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
                          colSpan={5}
                          className="text-center text-fg-tertiary"
                        >
                          <LoadingIndicator isLoading={isFetchingNextPage} />
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
                      <TableCell
                        className="py-1.5 overflow-hidden"
                        style={{ maxWidth: templateWidth }}
                      >
                        <Template name={build.template} />
                      </TableCell>
                      <TableCell className="py-1.5">
                        <CreatedAt timestamp={build.createdAt} />
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Duration
                          createdAt={build.createdAt}
                          finishedAt={build.finishedAt}
                          isRunning={build.status === 'building'}
                        />
                      </TableCell>
                      <TableCell className="py-1.5 overflow-hidden">
                        <Status
                          status={build.status}
                          statusMessage={build.statusMessage}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td
                      colSpan={5}
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
