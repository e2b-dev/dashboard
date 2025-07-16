import useSWR from 'swr'
import { ClientSandboxesMetrics } from '@/types/sandboxes.types'
import { useSelectedTeam } from '@/lib/hooks/use-teams'

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

  const { data, error, isLoading } = useSWR<MetricsResponse>(
    sandboxIds.length > 0
      ? [`/api/teams/${teamId}/sandboxes/metrics`, sandboxIds]
      : null,
    async ([url]) => {
      if (sandboxIds.length === 0) {
        return {
          metrics: {},
        }
      }

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
        const { error } = await response.json()

        throw new Error(error || 'Failed to fetch metrics')
      }

      return (await response.json()) as MetricsResponse
    },
    {
      refreshInterval: pollingInterval,
      errorRetryInterval: 1000,
      errorRetryCount: 3,
      revalidateIfStale: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      fallbackData: initialMetrics ? { metrics: initialMetrics } : undefined,
    }
  )

  return {
    metrics: data?.metrics ?? null,
    error,
    isLoading,
  }
}
