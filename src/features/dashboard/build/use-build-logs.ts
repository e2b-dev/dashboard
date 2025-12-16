'use client'

import type { BuildLogDTO } from '@/server/api/models/builds.models'
import { useTRPC } from '@/trpc/client'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { type LogLevelFilter } from './logs-filter-params'

const REFETCH_INTERVAL_MS = 1_500
const FORWARD_LOGS_PAGE_LIMIT = 100
const EMPTY_LOGS: BuildLogDTO[] = []

function getLogKey(log: BuildLogDTO): string {
  return `${log.timestampUnix}:${log.level}:${log.message}`
}

interface UseBuildLogsParams {
  teamIdOrSlug: string
  templateId: string
  buildId: string
  level: LogLevelFilter | null
  isBuilding: boolean
}

export function useBuildLogs({
  teamIdOrSlug,
  templateId,
  buildId,
  level,
  isBuilding,
}: UseBuildLogsParams) {
  const trpc = useTRPC()

  const backwardsQuery = useBackwardsLogs({
    trpc,
    teamIdOrSlug,
    templateId,
    buildId,
    level,
  })

  const forwardQuery = useForwardLogs({
    trpc,
    teamIdOrSlug,
    templateId,
    buildId,
    level,
    isBuilding,
    newestBackwardsTimestamp: backwardsQuery.newestTimestamp,
  })

  const mergedLogs = useMemo(() => {
    const { logs: forwardLogs } = forwardQuery
    const { logs: backwardsLogs } = backwardsQuery

    if (forwardLogs.length === 0) return backwardsLogs
    if (backwardsLogs.length === 0) return forwardLogs

    const seenKeys = new Set(forwardLogs.map(getLogKey))
    const uniqueBackwardsLogs = backwardsLogs.filter(
      (log) => !seenKeys.has(getLogKey(log))
    )
    return [...forwardLogs, ...uniqueBackwardsLogs]
  }, [forwardQuery.logs, backwardsQuery.logs])

  return {
    logs: mergedLogs,
    hasNextPage: backwardsQuery.hasNextPage,
    isFetchingNextPage: backwardsQuery.isFetchingNextPage,
    isFetching: backwardsQuery.isFetching || forwardQuery.isFetching,
    fetchNextPage: backwardsQuery.fetchNextPage,
  }
}

interface UseBackwardsLogsParams {
  trpc: ReturnType<typeof useTRPC>
  teamIdOrSlug: string
  templateId: string
  buildId: string
  level: LogLevelFilter | null
}

function useBackwardsLogs({
  trpc,
  teamIdOrSlug,
  templateId,
  buildId,
  level,
}: UseBackwardsLogsParams) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } =
    useInfiniteQuery(
      trpc.builds.buildLogsBackwards.infiniteQueryOptions(
        { teamIdOrSlug, templateId, buildId, level: level ?? undefined },
        {
          getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
          refetchIntervalInBackground: false,
          refetchOnWindowFocus: false,
          refetchInterval: false,
        }
      )
    )

  const logs = useMemo(
    () => data?.pages.flatMap((p) => p.logs) ?? EMPTY_LOGS,
    [data]
  )

  const newestTimestamp = logs[0]?.timestampUnix

  return {
    logs,
    newestTimestamp,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    fetchNextPage,
  }
}

interface UseForwardLogsParams {
  trpc: ReturnType<typeof useTRPC>
  teamIdOrSlug: string
  templateId: string
  buildId: string
  level: LogLevelFilter | null
  isBuilding: boolean
  newestBackwardsTimestamp: number | undefined
}

function useForwardLogs({
  trpc,
  teamIdOrSlug,
  templateId,
  buildId,
  level,
  isBuilding,
  newestBackwardsTimestamp,
}: UseForwardLogsParams) {
  const newestBackwardsTimestampRef = useRef(newestBackwardsTimestamp)
  const [isDrainingComplete, setIsDrainingComplete] = useState(false)
  const wasBuilding = useRef(false)

  useEffect(() => {
    if (newestBackwardsTimestamp !== undefined) {
      newestBackwardsTimestampRef.current = newestBackwardsTimestamp
    }
  }, [newestBackwardsTimestamp])

  useEffect(() => {
    if (isBuilding) {
      wasBuilding.current = true
      setIsDrainingComplete(false)
    }
  }, [isBuilding])

  const shouldFetch =
    newestBackwardsTimestamp !== undefined &&
    (isBuilding || (wasBuilding.current && !isDrainingComplete))

  const { data, fetchNextPage, isFetching } = useInfiniteQuery(
    trpc.builds.buildLogsForward.infiniteQueryOptions(
      {
        teamIdOrSlug,
        templateId,
        buildId,
        level: level ?? undefined,
        cursor: newestBackwardsTimestamp,
      },
      {
        getNextPageParam: (lastPage, allPages) => {
          if (lastPage.nextCursor !== null) {
            return lastPage.nextCursor + 1
          }

          const lastPageWithLogs = allPages.findLast(
            (p) => p.nextCursor !== null
          )

          if (
            !lastPageWithLogs?.nextCursor ||
            !newestBackwardsTimestampRef.current
          ) {
            return Date.now()
          }

          return (
            (lastPageWithLogs?.nextCursor ??
              newestBackwardsTimestampRef.current) + 1
          )
        },
        enabled: shouldFetch,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: false,
        refetchInterval: false,
      }
    )
  )

  useQuery({
    queryKey: ['forwardLogsTrigger', teamIdOrSlug, templateId, buildId, level],
    queryFn: async () => {
      let result = await fetchNextPage()
      let lastPage = result.data?.pages.at(-1)

      while (lastPage?.logs.length === FORWARD_LOGS_PAGE_LIMIT) {
        result = await fetchNextPage()
        lastPage = result.data?.pages.at(-1)
      }

      if (!isBuilding && lastPage?.logs.length === 0) {
        setIsDrainingComplete(true)
      }

      return null
    },
    enabled: shouldFetch,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
    refetchInterval: REFETCH_INTERVAL_MS,
  })

  const logs = useMemo(
    () => data?.pages.slice().reverse().flatMap((p) => p.logs) ?? EMPTY_LOGS,
    [data]
  )

  return { logs, isFetching }
}
