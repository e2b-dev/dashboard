'use client'

import { useDashboard } from '@/features/dashboard/context'
import type { SandboxMetric } from '@/server/api/models/sandboxes.models'
import { useTRPCClient } from '@/trpc/client'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import {
  SANDBOX_MONITORING_LIVE_POLLING_MS,
  SANDBOX_MONITORING_METRICS_FETCH_ERROR_MESSAGE,
  SANDBOX_MONITORING_QUERY_END_PARAM,
  SANDBOX_MONITORING_QUERY_LIVE_FALSE,
  SANDBOX_MONITORING_QUERY_LIVE_PARAM,
  SANDBOX_MONITORING_QUERY_LIVE_TRUE,
  SANDBOX_MONITORING_QUERY_START_PARAM,
} from '../utils/constants'
import { useSandboxMonitoringStore } from './store'

function parseQueryInteger(value: string | null): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function parseQueryBoolean(value: string | null): boolean | null {
  if (value === null) {
    return null
  }

  if (value === SANDBOX_MONITORING_QUERY_LIVE_TRUE || value === 'true') {
    return true
  }

  if (value === SANDBOX_MONITORING_QUERY_LIVE_FALSE || value === 'false') {
    return false
  }

  return null
}

export function useSandboxMonitoringController(sandboxId: string) {
  const trpcClient = useTRPCClient()
  const { team } = useDashboard()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const timeframe = useSandboxMonitoringStore((state) => state.timeframe)
  const metrics = useSandboxMonitoringStore((state) => state.metrics)
  const isLiveUpdating = useSandboxMonitoringStore(
    (state) => state.isLiveUpdating
  )
  const isInitialized = useSandboxMonitoringStore(
    (state) => state.isInitialized
  )
  const initialize = useSandboxMonitoringStore((state) => state.initialize)
  const setTimeframe = useSandboxMonitoringStore((state) => state.setTimeframe)
  const setMetrics = useSandboxMonitoringStore((state) => state.setMetrics)
  const setLiveUpdating = useSandboxMonitoringStore(
    (state) => state.setLiveUpdating
  )

  const urlState = useMemo(
    () => ({
      start: parseQueryInteger(
        searchParams.get(SANDBOX_MONITORING_QUERY_START_PARAM)
      ),
      end: parseQueryInteger(
        searchParams.get(SANDBOX_MONITORING_QUERY_END_PARAM)
      ),
      live: parseQueryBoolean(
        searchParams.get(SANDBOX_MONITORING_QUERY_LIVE_PARAM)
      ),
    }),
    [searchParams]
  )

  useEffect(() => {
    initialize(sandboxId, urlState)
  }, [initialize, sandboxId, urlState])

  useEffect(() => {
    if (!isInitialized) return

    const currentStart = searchParams.get(SANDBOX_MONITORING_QUERY_START_PARAM)
    const currentEnd = searchParams.get(SANDBOX_MONITORING_QUERY_END_PARAM)
    const currentLive = searchParams.get(SANDBOX_MONITORING_QUERY_LIVE_PARAM)
    const nextStart = String(timeframe.start)
    const nextEnd = String(timeframe.end)
    const nextLive = isLiveUpdating
      ? SANDBOX_MONITORING_QUERY_LIVE_TRUE
      : SANDBOX_MONITORING_QUERY_LIVE_FALSE

    if (
      currentStart === nextStart &&
      currentEnd === nextEnd &&
      currentLive === nextLive
    ) {
      return
    }

    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.set(SANDBOX_MONITORING_QUERY_START_PARAM, nextStart)
    nextParams.set(SANDBOX_MONITORING_QUERY_END_PARAM, nextEnd)
    nextParams.set(SANDBOX_MONITORING_QUERY_LIVE_PARAM, nextLive)

    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false })
  }, [
    isInitialized,
    isLiveUpdating,
    pathname,
    router,
    searchParams,
    timeframe.end,
    timeframe.start,
  ])

  const queryKey = useMemo(() => {
    if (isLiveUpdating) {
      return [
        'sandboxMonitoringMetrics',
        team?.id ?? '',
        sandboxId,
        'live',
        timeframe.duration,
      ] as const
    }

    return [
      'sandboxMonitoringMetrics',
      team?.id ?? '',
      sandboxId,
      'static',
      timeframe.start,
      timeframe.end,
    ] as const
  }, [
    isLiveUpdating,
    sandboxId,
    team?.id,
    timeframe.duration,
    timeframe.end,
    timeframe.start,
  ])

  const metricsQuery = useQuery<SandboxMetric[]>({
    queryKey,
    enabled: isInitialized && Boolean(team?.id),
    placeholderData: keepPreviousData,
    refetchInterval: isLiveUpdating
      ? SANDBOX_MONITORING_LIVE_POLLING_MS
      : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: isLiveUpdating ? 'always' : false,
    queryFn: async () => {
      if (!team?.id) {
        return []
      }

      const queryTimeframe = isLiveUpdating
        ? useSandboxMonitoringStore.getState().syncLiveTimeframe()
        : useSandboxMonitoringStore.getState().timeframe

      return trpcClient.sandbox.resourceMetrics.query({
        teamIdOrSlug: team.id,
        sandboxId,
        startMs: queryTimeframe.start,
        endMs: queryTimeframe.end,
      })
    },
  })

  useEffect(() => {
    if (metricsQuery.data) {
      setMetrics(metricsQuery.data)
    }
  }, [metricsQuery.data, setMetrics])

  const error = metricsQuery.error
    ? metricsQuery.error instanceof Error
      ? metricsQuery.error.message
      : SANDBOX_MONITORING_METRICS_FETCH_ERROR_MESSAGE
    : null

  return {
    timeframe,
    metrics,
    isLiveUpdating,
    isLoading: metricsQuery.isLoading || metricsQuery.isFetching,
    error,
    setTimeframe,
    setLiveUpdating,
  }
}
