'use client'

import { useTRPC } from '@/trpc/client'
import { Sandboxes } from '@/types/api.types'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useDebounceValue } from 'usehooks-ts'
import { useDashboard } from '../../../context'
import { useSandboxMetricsStore } from '../stores/metrics-store'

interface UseSandboxesMetricsProps {
  sandboxes: Sandboxes
  pollingInterval?: number
  debounceDelay?: number
}

export function useSandboxesMetrics({
  sandboxes,
  pollingInterval,
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

  const { data, error, isLoading } = useQuery(
    trpc.sandboxes.getSandboxesMetrics.queryOptions(
      {
        teamIdOrSlug: team.slug,
        sandboxIds: debouncedSandboxIds,
      },
      {
        enabled: debouncedSandboxIds.length > 0 && pollingInterval !== 0,
        refetchInterval: pollingInterval,
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

  return {
    metrics: data?.metrics ?? null,
    error,
    isLoading,
  }
}
