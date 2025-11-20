'use client'

import { useTRPC } from '@/trpc/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'
import {
  useQuery,
  useQueryClient,
  useSuspenseInfiniteQuery,
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

  const {
    data: builds,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching: isFetchingList,
    error: listError,
  } = useSuspenseInfiniteQuery(
    trpc.builds.list.infiniteQueryOptions(
      {
        teamIdOrSlug,
        statuses,
        buildIdOrTemplate,
      },
      {
        getNextPageParam: (page) => page.nextCursor,
      }
    )
  )

  const allBuilds = useMemo(() => builds.pages.flatMap((p) => p.data), [builds])

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
      fetchNextPage()
    }
  }, [
    hasNextPage,
    fetchNextPage,
    buildsWithUpdatedStatuses.length,
    isFetchingNextPage,
    virtualItems,
  ])

  if (listError || buildsWithUpdatedStatuses.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-24">Build ID</TableHead>
                <TableHead className="min-w-18">Status</TableHead>
                <TableHead className="min-w-48">Template</TableHead>
                <TableHead className="min-w-24">Duration</TableHead>
                <TableHead className="w-full">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5}>
                  <BuildsEmpty error={listError?.message} />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  const paddingTop = virtualItems.length > 0 ? (virtualItems[0]?.start ?? 0) : 0
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() -
        (virtualItems[virtualItems.length - 1]?.end ?? 0)
      : 0

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div ref={parentRef} className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-bg">
            <TableRow>
              <TableHead className="min-w-24">Build ID</TableHead>
              <TableHead className="min-w-48">Template</TableHead>
              <TableHead className="min-w-24">Started</TableHead>
              <TableHead className="min-w-24">Duration</TableHead>
              <TableHead className="w-full">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paddingTop > 0 && (
              <tr>
                <td colSpan={5} style={{ height: paddingTop, padding: 0 }} />
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
                  <TableCell className="py-1.5">
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
                  <TableCell className="py-1.5">
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
                <td colSpan={5} style={{ height: paddingBottom, padding: 0 }} />
              </tr>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default BuildsTable
