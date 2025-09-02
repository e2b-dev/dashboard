import { SandboxesMonitoringPageParams } from '@/app/dashboard/[teamIdOrSlug]/sandboxes/@monitoring/default'
import { TEAM_METRICS_POLLING_INTERVAL_MS } from '@/configs/intervals'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import ErrorTooltip from '@/ui/error-tooltip'
import { LiveBadge } from '@/ui/live'
import { Skeleton } from '@/ui/primitives/skeleton'
import { AlertTriangle } from 'lucide-react'
import { Suspense } from 'react'
import {
  ConcurrentSandboxesClient,
  SandboxesStartRateClient,
} from './header.client'

function BaseCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 md:p-6 max-md:not-last:border-b md:not-last:border-r h-full flex-1 w-full flex flex-col justify-center items-center gap-3 relative">
      {children}
    </div>
  )
}

function BaseSubtitle({ children }: { children: React.ReactNode }) {
  return <span className="label-tertiary text-center">{children}</span>
}

function BaseErrorTooltip({ children }: { children: React.ReactNode }) {
  return (
    <ErrorTooltip
      trigger={
        <span className="inline-flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-accent-error-highlight" />
          <span className="prose-body-highlight text-accent-error-highlight">
            Failed
          </span>
        </span>
      }
    >
      {children}
    </ErrorTooltip>
  )
}

export default function SandboxesMonitoringHeader({
  params,
}: {
  params: Promise<SandboxesMonitoringPageParams>
}) {
  return (
    <div className="flex md:flex-row flex-col items-center border-b w-full min-h-52">
      <BaseCard>
        <LiveBadge className="absolute left-3 top-3 md:left-6 md:top-6" />

        <Suspense fallback={<Skeleton className="w-16 h-8" />}>
          <SandboxesStartRate params={params} />
        </Suspense>
        <BaseSubtitle>
          Sandboxes/Sec. <br />
          (5 sec average)
        </BaseSubtitle>
      </BaseCard>

      <BaseCard>
        <LiveBadge className="absolute left-3 top-3 md:left-6 md:top-6" />
        <Suspense fallback={<Skeleton className="w-16 h-8" />}>
          <ConcurrentSandboxes params={params} />
        </Suspense>
        <BaseSubtitle>
          Concurrent Sandboxes <br />
          (5 sec average)
        </BaseSubtitle>
      </BaseCard>

      <BaseCard>
        <Suspense fallback={<Skeleton className="w-16 h-8" />}>
          <MaxConcurrentSandboxes params={params} />
        </Suspense>
        <BaseSubtitle>
          Max. Concurrent Sandboxes
          <br />
          (Last 30 Days)
        </BaseSubtitle>
      </BaseCard>
    </div>
  )
}

function getTeamMetricsLast30Days(teamId: string) {
  return getTeamMetrics({
    teamId,
    startDate: Date.now() - 1000 * 60 * 60 * 24 * 30,
    endDate: Date.now(),
  })
}

// Components

const now = Date.now()

export const ConcurrentSandboxes = async ({
  params,
}: {
  params: Promise<SandboxesMonitoringPageParams>
}) => {
  const { teamIdOrSlug } = await params
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  const end = now
  const start = end - TEAM_METRICS_POLLING_INTERVAL_MS

  const teamMetricsResult = await getTeamMetrics({
    teamId,
    startDate: start,
    endDate: end,
  })

  if (!teamMetricsResult?.data || teamMetricsResult.serverError) {
    return (
      <BaseErrorTooltip>
        {teamMetricsResult?.serverError ||
          'Failed to load concurrent sandboxes'}
      </BaseErrorTooltip>
    )
  }

  return <ConcurrentSandboxesClient initialData={teamMetricsResult.data} />
}

export const SandboxesStartRate = async ({
  params,
}: {
  params: Promise<SandboxesMonitoringPageParams>
}) => {
  const { teamIdOrSlug } = await params
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  const end = now
  const start = end - TEAM_METRICS_POLLING_INTERVAL_MS

  const teamMetricsResult = await getTeamMetrics({
    teamId,
    startDate: start,
    endDate: end,
  })

  if (!teamMetricsResult?.data || teamMetricsResult.serverError) {
    return (
      <BaseErrorTooltip>
        {teamMetricsResult?.serverError ||
          'Failed to load max sandbox start rate'}
      </BaseErrorTooltip>
    )
  }

  return <SandboxesStartRateClient initialData={teamMetricsResult.data} />
}

export const MaxConcurrentSandboxes = async ({
  params,
}: {
  params: Promise<SandboxesMonitoringPageParams>
}) => {
  const { teamIdOrSlug } = await params
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  const teamMetricsResult = await getTeamMetricsLast30Days(teamId)

  if (!teamMetricsResult?.data || teamMetricsResult.serverError) {
    return (
      <BaseErrorTooltip>
        {teamMetricsResult?.serverError ||
          'Failed to load max concurrent sandboxes'}
      </BaseErrorTooltip>
    )
  }

  const concurrentSandboxes = Math.max(
    ...teamMetricsResult.data.metrics.map(
      (item) => item.concurrentSandboxes ?? 0
    )
  )

  return <span className="prose-value-big">{concurrentSandboxes}</span>
}
