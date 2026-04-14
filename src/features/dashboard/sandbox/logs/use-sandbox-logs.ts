'use client'

import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useStore } from 'zustand'
import { useTRPCClient } from '@/trpc/client'
import type { LogLevelFilter } from './logs-filter-params'
import {
  createSandboxLogsStore,
  type SandboxLogsStore,
} from './sandbox-logs-store'

const REFETCH_INTERVAL_MS = 3_000
const DRAIN_AFTER_STOP_WINDOW_MS = 10_000
const MIN_EMPTY_DRAIN_POLLS = 2

interface UseSandboxLogsParams {
  teamSlug: string
  sandboxId: string
  isRunning: boolean
  level: LogLevelFilter | null
  search: string
}

export function useSandboxLogs({
  teamSlug,
  sandboxId,
  isRunning,
  level,
  search,
}: UseSandboxLogsParams) {
  const trpcClient = useTRPCClient()
  const storeRef = useRef<SandboxLogsStore | null>(null)

  if (!storeRef.current) {
    storeRef.current = createSandboxLogsStore()
  }

  const store = storeRef.current

  const logs = useStore(store, (s) => s.logs)
  const isInitialized = useStore(store, (s) => s.isInitialized)
  const hasCompletedInitialLoad = useStore(
    store,
    (s) => s.hasCompletedInitialLoad
  )
  const initialLoadError = useStore(store, (s) => s.initialLoadError)
  const hasMoreBackwards = useStore(store, (s) => s.hasMoreBackwards)
  const isLoadingBackwards = useStore(store, (s) => s.isLoadingBackwards)
  const isLoadingForwards = useStore(store, (s) => s.isLoadingForwards)

  useLayoutEffect(() => {
    store.getState().init(trpcClient, { teamSlug, sandboxId }, level, search)
  }, [store, trpcClient, teamSlug, sandboxId, level, search])

  const isDraining = useRef(false)
  const prevIsRunningRef = useRef(isRunning)
  const drainUntilTimestampMs = useRef<number | null>(null)
  const consecutiveEmptyDrainPolls = useRef(0)

  useEffect(() => {
    if (isRunning) {
      isDraining.current = true
      drainUntilTimestampMs.current = null
      consecutiveEmptyDrainPolls.current = 0
      prevIsRunningRef.current = true
      return
    }

    if (prevIsRunningRef.current) {
      isDraining.current = true
      drainUntilTimestampMs.current = Date.now() + DRAIN_AFTER_STOP_WINDOW_MS
      consecutiveEmptyDrainPolls.current = 0
    }

    prevIsRunningRef.current = false
  }, [isRunning])

  const shouldPoll = isInitialized && (isRunning || isDraining.current)

  const { isFetching: isPolling } = useQuery({
    queryKey: ['sandboxLogsForward', teamSlug, sandboxId, level, search],
    queryFn: async () => {
      const { logsCount } = await store.getState().fetchMoreForwards()

      if (!isRunning) {
        if (logsCount > 0) {
          consecutiveEmptyDrainPolls.current = 0

          if (drainUntilTimestampMs.current !== null) {
            drainUntilTimestampMs.current =
              Date.now() + DRAIN_AFTER_STOP_WINDOW_MS
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
    hasCompletedInitialLoad,
    initialLoadError,
    hasNextPage: hasMoreBackwards,
    isFetchingNextPage: isLoadingBackwards,
    isFetching: isLoadingBackwards || isLoadingForwards || isPolling,
    fetchNextPage,
  }
}
