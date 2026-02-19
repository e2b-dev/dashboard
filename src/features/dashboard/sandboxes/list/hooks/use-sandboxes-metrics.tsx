'use client'

import { SANDBOXES_METRICS_POLLING_MS } from '@/configs/intervals'
import { useTRPC } from '@/trpc/client'
import type { Sandboxes } from '@/types/api.types'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { useDashboard } from '../../../context'
import { useSandboxMetricsStore } from '../stores/metrics-store'

interface UseSandboxesMetricsProps {
  sandboxes: Sandboxes
  pollingIntervalMs?: number
  isListScrolling?: boolean
}

const hasSameSandboxIds = (first: string[], second: string[]) =>
  first.length === second.length &&
  first.every((sandboxId, index) => sandboxId === second[index])

function useStableSandboxIdsWhileScrolling(
  sandboxIds: string[],
  isListScrolling: boolean
) {
  const activeSandboxIdsRef = useRef<string[]>(sandboxIds)

  if (
    !isListScrolling &&
    !hasSameSandboxIds(activeSandboxIdsRef.current, sandboxIds)
  ) {
    activeSandboxIdsRef.current = sandboxIds
  }

  return activeSandboxIdsRef.current
}

export function useSandboxesMetrics({
  sandboxes,
  pollingIntervalMs = SANDBOXES_METRICS_POLLING_MS,
  isListScrolling = false,
}: UseSandboxesMetricsProps) {
  const { team } = useDashboard()
  const trpc = useTRPC()

  const sandboxIds = useMemo(
    () => sandboxes.map((sbx) => sbx.sandboxID),
    [sandboxes]
  )
  const activeSandboxIds = useStableSandboxIdsWhileScrolling(
    sandboxIds,
    isListScrolling
  )

  const setMetrics = useSandboxMetricsStore((s) => s.setMetrics)
  const shouldFetchMetrics =
    !isListScrolling && activeSandboxIds.length > 0 && pollingIntervalMs !== 0

  const metricsQueryInput = useMemo(
    () => ({
      teamIdOrSlug: team.slug ?? team.id,
      sandboxIds: activeSandboxIds,
    }),
    [activeSandboxIds, team.id, team.slug]
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
