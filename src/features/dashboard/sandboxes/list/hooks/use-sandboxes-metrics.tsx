'use client'

import { MOCK_METRICS_DATA } from '@/configs/mock-data'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { Sandboxes } from '@/types/api'
import { ClientSandboxesMetrics } from '@/types/sandboxes.types'
import { useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { useDebounceValue } from 'usehooks-ts'
import { useSandboxMetricsStore } from '../stores/metrics-store'

interface MetricsResponse {
  metrics: ClientSandboxesMetrics
  error?: string
}

interface UseSandboxesMetricsProps {
  sandboxes: Sandboxes
  initialMetrics?: ClientSandboxesMetrics | null
  pollingInterval?: number
  debounceDelay?: number
}

export function useSandboxesMetrics({
  sandboxes,
  initialMetrics = null,
  pollingInterval,
  debounceDelay = 1000,
}: UseSandboxesMetricsProps) {
  const teamId = useSelectedTeam()?.id

  const sandboxIds = useMemo(
    () => sandboxes.map((sbx) => sbx.sandboxID),
    [sandboxes]
  )

  const [debouncedSandboxIds] = useDebounceValue(sandboxIds, debounceDelay)

  const { data, error, isLoading } = useSWR<MetricsResponse>(
    debouncedSandboxIds.length > 0
      ? [`/api/teams/${teamId}/sandboxes/metrics`, debouncedSandboxIds]
      : null,
    async ([url, ids]: [string, string[]]) => {
      if (ids.length === 0) {
        return {
          metrics: initialMetrics ?? {},
        }
      }

      if (process.env.NEXT_PUBLIC_MOCK_DATA === '1') {
        return MOCK_METRICS_DATA(sandboxes)
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sandboxIds: ids }),
        cache: 'no-store',
      })

      if (!response.ok) {
        const { error } = await response.json()

        throw new Error(error || 'Failed to fetch metrics')
      }

      return (await response.json()) as MetricsResponse
    },
    {
      refreshInterval: pollingInterval,
      shouldRetryOnError: true,
      errorRetryCount: 100,
      errorRetryInterval: pollingInterval,
      revalidateOnMount: true,
      revalidateIfStale: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,

      fallbackData: initialMetrics ? { metrics: initialMetrics } : undefined,
    }
  )

  const setMetrics = useSandboxMetricsStore((s) => s.setMetrics)

  useEffect(() => {
    if (data?.metrics) {
      setMetrics(data.metrics)
    }
  }, [data?.metrics, setMetrics])

  return {
    metrics: data?.metrics ?? null,
    error,
    isLoading,
  }
}
