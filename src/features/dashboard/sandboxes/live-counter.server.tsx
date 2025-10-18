import { l } from '@/lib/clients/logger/logger'
import { cn } from '@/lib/utils'
import { getNowMemo } from '@/lib/utils/server'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { Skeleton } from '@/ui/primitives/skeleton'
import { Suspense } from 'react'
import { LiveSandboxCounterClient } from './live-counter.client'

interface LiveSandboxCounterServerProps {
  params: Promise<{ teamIdOrSlug: string }>
  className?: string
}

export async function LiveSandboxCounterServer({
  params,
  className,
}: LiveSandboxCounterServerProps) {
  return (
    <Suspense
      fallback={
        <Skeleton className={cn(className, 'border h-[42px] w-[250px]')} />
      }
    >
      <LiveSandboxCounterResolver params={params} className={className} />
    </Suspense>
  )
}

async function LiveSandboxCounterResolver({
  params,
  className,
}: LiveSandboxCounterServerProps) {
  const { teamIdOrSlug } = await params

  // use request-consistent timestamp for cache deduplication
  const now = getNowMemo()
  const start = now - 60_000

  const teamMetricsResult = await getTeamMetrics({
    teamIdOrSlug,
    startDate: start,
    endDate: now,
  })

  if (!teamMetricsResult?.data || teamMetricsResult.serverError) {
    l.error(
      {
        key: 'live_sandbox_counter:error',
        context: {
          teamIdOrSlug,
          serverError: teamMetricsResult?.serverError,
        },
      },
      'Failed to load live sandbox count'
    )

    return null
  }

  return (
    <LiveSandboxCounterClient
      initialData={teamMetricsResult.data}
      className={className}
    />
  )
}
