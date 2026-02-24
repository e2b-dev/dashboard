'use client'

import { SANDBOXES_DETAILS_METRICS_POLLING_MS } from '@/configs/intervals'
import { useDashboard } from '@/features/dashboard/context'
import { useTRPCClient } from '@/trpc/client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo } from 'react'
import { useSandboxMonitoringStore } from '../store'

function parseQueryInteger(value: string | null): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

export function useSandboxMonitoringController(sandboxId: string) {
  const trpcClient = useTRPCClient()
  const { team } = useDashboard()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const timeframe = useSandboxMonitoringStore((state) => state.timeframe)
  const metrics = useSandboxMonitoringStore((state) => state.metrics)
  const isLoading = useSandboxMonitoringStore((state) => state.isLoading)
  const error = useSandboxMonitoringStore((state) => state.error)
  const isInitialized = useSandboxMonitoringStore(
    (state) => state.isInitialized
  )
  const initialize = useSandboxMonitoringStore((state) => state.initialize)
  const setTimeframe = useSandboxMonitoringStore((state) => state.setTimeframe)
  const setMetrics = useSandboxMonitoringStore((state) => state.setMetrics)
  const setLoading = useSandboxMonitoringStore((state) => state.setLoading)
  const setError = useSandboxMonitoringStore((state) => state.setError)

  const urlTimeframe = useMemo(
    () => ({
      start: parseQueryInteger(searchParams.get('start')),
      end: parseQueryInteger(searchParams.get('end')),
    }),
    [searchParams]
  )

  useEffect(() => {
    initialize(sandboxId, urlTimeframe)
  }, [initialize, sandboxId, urlTimeframe])

  useEffect(() => {
    if (!isInitialized) return

    const currentStart = searchParams.get('start')
    const currentEnd = searchParams.get('end')
    const nextStart = String(timeframe.start)
    const nextEnd = String(timeframe.end)

    if (currentStart === nextStart && currentEnd === nextEnd) {
      return
    }

    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.set('start', nextStart)
    nextParams.set('end', nextEnd)

    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false })
  }, [
    isInitialized,
    pathname,
    router,
    searchParams,
    timeframe.end,
    timeframe.start,
  ])

  const fetchMetrics = useCallback(async () => {
    if (!team?.id) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await trpcClient.sandbox.resourceMetrics.query({
        teamIdOrSlug: team.id,
        sandboxId,
        startMs: timeframe.start,
        endMs: timeframe.end,
      })

      setMetrics(result)
      setError(null)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to fetch sandbox monitoring metrics.'
      )
    } finally {
      setLoading(false)
    }
  }, [
    sandboxId,
    setError,
    setLoading,
    setMetrics,
    team?.id,
    timeframe.end,
    timeframe.start,
    trpcClient,
  ])

  useEffect(() => {
    if (!isInitialized) return
    void fetchMetrics()
  }, [fetchMetrics, isInitialized])

  useEffect(() => {
    if (!isInitialized || !timeframe.isLive) return

    const intervalId = setInterval(() => {
      void fetchMetrics()
    }, SANDBOXES_DETAILS_METRICS_POLLING_MS)

    return () => {
      clearInterval(intervalId)
    }
  }, [fetchMetrics, isInitialized, timeframe.isLive])

  return {
    timeframe,
    metrics,
    isLoading,
    error,
    setTimeframe,
  }
}
