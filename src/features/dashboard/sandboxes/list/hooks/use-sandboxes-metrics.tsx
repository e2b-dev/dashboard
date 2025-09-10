'use client'

import { USE_MOCK_DATA } from '@/configs/flags'
import { MOCK_METRICS_DATA } from '@/configs/mock-data'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { Sandboxes } from '@/types/api'
import { ClientSandboxesMetrics } from '@/types/sandboxes.types'
import { useMemo } from 'react'
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

  const setMetrics = useSandboxMetricsStore((s) => s.setMetrics)

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

      if (USE_MOCK_DATA) {
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
      revalidateOnMount: false,
      revalidateIfStale: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      keepPreviousData: true,

      fallbackData: initialMetrics ? { metrics: initialMetrics } : undefined,
      onSuccess: (data) => {
        setMetrics(data.metrics)
      },
    }
  )

  return {
    metrics: data?.metrics ?? null,
    error,
    isLoading,
  }
}
