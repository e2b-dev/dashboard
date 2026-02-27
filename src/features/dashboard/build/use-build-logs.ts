'use client'

import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { useStore } from 'zustand'
import type { BuildStatusDTO } from '@/server/api/models/builds.models'
import { useTRPCClient } from '@/trpc/client'
import { type BuildLogsStore, createBuildLogsStore } from './build-logs-store'
import type { LogLevelFilter } from './logs-filter-params'

const REFETCH_INTERVAL_MS = 1_500
const DRAIN_AFTER_BUILD_STOP_WINDOW_MS = 10_000
const MIN_EMPTY_DRAIN_POLLS = 2

interface UseBuildLogsParams {
  teamIdOrSlug: string
  templateId: string
  buildId: string
  level: LogLevelFilter | null
  buildStatus: BuildStatusDTO
}

export function useBuildLogs({
  teamIdOrSlug,
  templateId,
  buildId,
  level,
  buildStatus,
}: UseBuildLogsParams) {
  const trpcClient = useTRPCClient()
  const storeRef = useRef<BuildLogsStore | null>(null)

  if (!storeRef.current) {
    storeRef.current = createBuildLogsStore()
  }

  const store = storeRef.current

  const logs = useStore(store, (s) => s.logs)
  const isInitialized = useStore(store, (s) => s.isInitialized)
  const hasMoreBackwards = useStore(store, (s) => s.hasMoreBackwards)
  const isLoadingBackwards = useStore(store, (s) => s.isLoadingBackwards)
  const isLoadingForwards = useStore(store, (s) => s.isLoadingForwards)

  useEffect(() => {
    store
      .getState()
      .init(trpcClient, { teamIdOrSlug, templateId, buildId }, level)
  }, [store, trpcClient, teamIdOrSlug, templateId, buildId, level])

  const isBuilding = buildStatus === 'building'
  const isDraining = useRef(false)
  const prevIsBuildingRef = useRef(isBuilding)
  const drainUntilTimestampMs = useRef<number | null>(null)
  const consecutiveEmptyDrainPolls = useRef(0)

  useEffect(() => {
    if (isBuilding) {
      isDraining.current = true
      drainUntilTimestampMs.current = null
      consecutiveEmptyDrainPolls.current = 0
      prevIsBuildingRef.current = true
      return
    }

    if (prevIsBuildingRef.current) {
      isDraining.current = true
      drainUntilTimestampMs.current =
        Date.now() + DRAIN_AFTER_BUILD_STOP_WINDOW_MS
      consecutiveEmptyDrainPolls.current = 0
    }

    prevIsBuildingRef.current = false
  }, [isBuilding])

  const shouldPoll = isInitialized && (isBuilding || isDraining.current)

  const { isFetching: isPolling } = useQuery({
    queryKey: ['buildLogsForward', teamIdOrSlug, templateId, buildId, level],
    queryFn: async () => {
      const { logsCount } = await store.getState().fetchMoreForwards()

      if (!isBuilding) {
        if (logsCount > 0) {
          consecutiveEmptyDrainPolls.current = 0

          if (drainUntilTimestampMs.current !== null) {
            drainUntilTimestampMs.current =
              Date.now() + DRAIN_AFTER_BUILD_STOP_WINDOW_MS
          }
        } else {
          consecutiveEmptyDrainPolls.current += 1

          const drainWindowElapsed =
            drainUntilTimestampMs.current !== null &&
            Date.now() >= drainUntilTimestampMs.current

          if (
            drainWindowElapsed &&
            consecutiveEmptyDrainPolls.current >= MIN_EMPTY_DRAIN_POLLS
          ) {
            isDraining.current = false
            drainUntilTimestampMs.current = null
            consecutiveEmptyDrainPolls.current = 0
          }
        }
      }

      return { logsCount }
    },
    enabled: shouldPoll,
    refetchInterval: shouldPoll ? REFETCH_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
  })

  const fetchNextPage = useCallback(() => {
    store.getState().fetchMoreBackwards()
  }, [store])

  return {
    logs,
    isInitialized,
    hasNextPage: hasMoreBackwards,
    isFetchingNextPage: isLoadingBackwards,
    isFetching: isLoadingBackwards || isLoadingForwards || isPolling,
    fetchNextPage,
  }
}
