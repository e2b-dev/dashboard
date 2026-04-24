'use client'

import { useQueries } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { SANDBOXES_METRICS_POLLING_MS } from '@/configs/intervals'
import type { Sandboxes } from '@/core/modules/sandboxes/models'
import type { ClientSandboxesMetrics } from '@/core/modules/sandboxes/models.client'
import { MAX_SANDBOX_IDS_PER_REQUEST } from '@/core/modules/sandboxes/schemas'
import { areStringArraysEqual } from '@/lib/utils/array'
import { useTRPC } from '@/trpc/client'
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

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
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

  const sandboxIdChunks = useMemo(
    () => chunkArray(activeSandboxIds, MAX_SANDBOX_IDS_PER_REQUEST),
    [activeSandboxIds]
  )

  const { metrics: mergedMetrics } = useQueries({
    queries: sandboxIdChunks.map((chunk) =>
      trpc.sandboxes.getSandboxesMetrics.queryOptions(
        {
          teamSlug: team.slug,
          sandboxIds: chunk,
        },
        {
          enabled: shouldEnableMetricsQuery,
          refetchInterval: metricsRefetchInterval,
          refetchOnWindowFocus: false,
          refetchOnMount: false,
          refetchOnReconnect: true,
          refetchIntervalInBackground: false,
        }
      )
    ),
    combine: (results) => {
      const hasError = results.some((r) => r.isError)
      if (hasError) {
        return { metrics: undefined }
      }

      const merged: ClientSandboxesMetrics = {}
      for (const result of results) {
        if (result.data?.metrics) {
          Object.assign(merged, result.data.metrics)
        }
      }
      return {
        metrics: Object.keys(merged).length > 0 ? merged : undefined,
      }
    },
  })

  useEffect(() => {
    if (mergedMetrics) {
      setMetrics(mergedMetrics)
    }
  }, [mergedMetrics, setMetrics])
}
