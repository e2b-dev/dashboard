'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { SANDBOXES_METRICS_POLLING_MS } from '@/configs/intervals'
import { areStringArraysEqual } from '@/lib/utils/array'
import { useTRPC } from '@/trpc/client'
import type { Sandboxes } from '@/types/api.types'
import { useDashboard } from '../../../context'
import { useSandboxMetricsStore } from '../stores/metrics-store'

interface UseSandboxesMetricsProps {
  sandboxes: Sandboxes
  pollingIntervalMs?: number
  isListScrolling?: boolean
}

function useStableSandboxIdsWhileScrolling(
  sandboxIds: string[],
  isListScrolling: boolean
) {
  const activeSandboxIdsRef = useRef<string[]>(sandboxIds)

  if (
    !isListScrolling &&
    !areStringArraysEqual(activeSandboxIdsRef.current, sandboxIds)
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
  const shouldEnableMetricsQuery =
    !isListScrolling && activeSandboxIds.length > 0
  const metricsRefetchInterval =
    pollingIntervalMs > 0 ? pollingIntervalMs : false

  const metricsQueryInput = useMemo(
    () => ({
      teamIdOrSlug: team.slug ?? team.id,
      sandboxIds: activeSandboxIds,
    }),
    [activeSandboxIds, team.id, team.slug]
  )

  const { data } = useQuery(
    trpc.sandboxes.getSandboxesMetrics.queryOptions(metricsQueryInput, {
      enabled: shouldEnableMetricsQuery,
      refetchInterval: metricsRefetchInterval,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
      refetchIntervalInBackground: false,
    })
  )

  useEffect(() => {
    if (data?.metrics) {
      setMetrics(data.metrics)
    }
  }, [data, setMetrics])
}
