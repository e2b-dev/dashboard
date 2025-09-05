import { l } from '@/lib/clients/logger/logger'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
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
      fallback={<Skeleton className="h-[60px] w-[250px] bg-bg-highlight" />}
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

  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  const now = Date.now()
  const end = now
  const start = end - 60_000 // last 60 seconds

  const teamMetricsResult = await getTeamMetrics({
    teamId,
    startDate: start,
    endDate: end,
  })

  if (!teamMetricsResult?.data || teamMetricsResult.serverError) {
    l.error(
      {
        key: 'live_sandbox_counter:error',
        team_id: teamId,
        context: {
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
