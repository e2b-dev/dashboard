import useSWR from 'swr'
import { ClientSandboxesMetrics } from '@/types/sandboxes.types'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { Sandboxes } from '@/types/api'
import { MOCK_METRICS_DATA } from '@/configs/mock-data'

interface MetricsResponse {
  metrics: ClientSandboxesMetrics
  error?: string
}

interface UseSandboxesMetricsProps {
  sandboxes: Sandboxes
  initialMetrics?: ClientSandboxesMetrics | null
  pollingInterval?: number
}

export function useSandboxesMetrics({
  sandboxes,
  initialMetrics = null,
  pollingInterval,
}: UseSandboxesMetricsProps) {
  const teamId = useSelectedTeam()?.id

  const sandboxIds = sandboxes.map((sbx) => sbx.sandboxID)

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

      if (process.env.NEXT_PUBLIC_MOCK_DATA === '1') {
        return MOCK_METRICS_DATA(sandboxes)
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sandboxIds }),
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
