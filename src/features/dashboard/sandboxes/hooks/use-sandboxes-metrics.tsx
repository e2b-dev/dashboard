import useSWR from 'swr'
import { useSandboxTableStore } from '../stores/table-store'
import { ClientSandboxesMetrics } from '@/types/sandboxes.types'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { useEffect, useMemo } from 'react'

interface MetricsResponse {
  metrics: ClientSandboxesMetrics
  error?: string
}

interface UseSandboxesMetricsProps {
  sandboxIds: string[]
  initialMetrics?: ClientSandboxesMetrics | null
  pollingInterval?: number
}

export function useSandboxesMetrics({
  sandboxIds,
  initialMetrics = null,
  pollingInterval,
}: UseSandboxesMetricsProps) {
  const teamId = useSelectedTeam()?.id

  const { setMetrics, setMetricsPending } = useSandboxTableStore()

  const { data, error, isLoading } = useSWR<MetricsResponse>(
    sandboxIds.length > 0
      ? [`/api/teams/${teamId}/sandboxes/metrics`, sandboxIds]
      : null,
    async ([url]) => {
      console.log('fetching metrics')

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sandboxIds }),
        next: {
          revalidate: 3,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch metrics')
      }

      return (await response.json()) as MetricsResponse
    },
    {
      refreshInterval: pollingInterval,
      revalidateIfStale: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      fallbackData: initialMetrics ? { metrics: initialMetrics } : undefined,
      onSuccess: (data) => {
        setMetrics(data.metrics)
        setMetricsPending(false)
      },
      onError: () => {
        setMetrics(null)
        setMetricsPending(false)
      },
      onLoadingSlow: () => {
        setMetricsPending(true)
      },
    }
  )

  useEffect(() => {
    setMetrics(initialMetrics)
  }, [initialMetrics, setMetrics])

  return {
    metrics: data?.metrics ?? null,
    error,
    isLoading,
  }
}

export function useLatestSandboxMetrics(sandboxId: string) {
  const { metrics } = useSandboxesMetrics({
    sandboxIds: [sandboxId],
    pollingInterval: 1000,
  })

  const latestMetrics = useMemo(() => {
    return metrics?.[sandboxId] ?? null
  }, [metrics, sandboxId])

  return {
    metrics: latestMetrics,
  }
}
