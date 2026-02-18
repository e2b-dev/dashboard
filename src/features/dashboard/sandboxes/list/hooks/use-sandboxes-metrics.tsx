'use client'

import { SANDBOXES_METRICS_POLLING_MS } from '@/configs/intervals'
import { useTRPC } from '@/trpc/client'
import type { Sandboxes } from '@/types/api.types'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useDebounceValue } from 'usehooks-ts'
import { useDashboard } from '../../../context'
import { useSandboxMetricsStore } from '../stores/metrics-store'

interface UseSandboxesMetricsProps {
  sandboxes: Sandboxes
  pollingIntervalMs?: number
  debounceDelay?: number
}

export function useSandboxesMetrics({
  sandboxes,
  pollingIntervalMs = SANDBOXES_METRICS_POLLING_MS,
  debounceDelay = 1000,
}: UseSandboxesMetricsProps) {
  const { team } = useDashboard()
  const trpc = useTRPC()

  const sandboxIds = useMemo(
    () => sandboxes.map((sbx) => sbx.sandboxID),
    [sandboxes]
  )

  const [debouncedSandboxIds] = useDebounceValue(sandboxIds, debounceDelay)

  const setMetrics = useSandboxMetricsStore((s) => s.setMetrics)
  const shouldFetchMetrics =
    debouncedSandboxIds.length > 0 && pollingIntervalMs !== 0

  const metricsQueryInput = useMemo(
    () => ({
      teamIdOrSlug: team.slug ?? team.id,
      sandboxIds: debouncedSandboxIds,
    }),
    [debouncedSandboxIds, team.id, team.slug]
  )

  const { data } = useQuery(
    trpc.sandboxes.getSandboxesMetrics.queryOptions(
      metricsQueryInput,
      {
        enabled: shouldFetchMetrics,
        refetchInterval: pollingIntervalMs,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
        refetchIntervalInBackground: false,
      }
    )
  )

  useEffect(() => {
    if (data?.metrics) {
      setMetrics(data.metrics)
    }
  }, [data, setMetrics])
}
