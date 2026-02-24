import { useDashboard } from '@/features/dashboard/context'
import { useTimeframe } from '@/features/dashboard/sandboxes/monitoring/hooks/use-timeframe'
import { useTRPC } from '@/trpc/client'
import { keepPreviousData, useQuery } from '@tanstack/react-query'

export function useSandboxMetrics(sandboxId: string) {
  const trpc = useTRPC()
  const { team } = useDashboard()
  const { timeframe, setTimeRange, setCustomRange } = useTimeframe()

  const { data, error, isLoading } = useQuery(
    trpc.sandbox.resourceMetrics.queryOptions(
      {
        teamIdOrSlug: team.id,
        sandboxId,
        startMs: timeframe.start,
        endMs: timeframe.end,
      },
      {
        refetchOnWindowFocus: false,
        placeholderData: keepPreviousData,
      }
    )
  )

  return {
    data,
    error,
    isLoading,

    setTimeRange,
    setCustomRange,
  }
}
