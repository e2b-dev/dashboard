import { SandboxesMonitoringPageParams } from '@/app/dashboard/[teamIdOrSlug]/sandboxes/@monitoring/page'
import { formatNumber } from '@/lib/utils/formatting'
import { getNowMemo, resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { getTeamMetricsMax } from '@/server/sandboxes/get-team-metrics-max'
import { getTeamTierLimits } from '@/server/team/get-team-tier-limits'
import ErrorTooltip from '@/ui/error-tooltip'
import { SemiLiveBadge } from '@/ui/live'
import { Skeleton } from '@/ui/primitives/skeleton'
import { AlertTriangle } from 'lucide-react'
import { Suspense } from 'react'
import {
  ConcurrentSandboxesClient,
  SandboxesStartRateClient,
} from './header.client'
import { MAX_DAYS_AGO } from './time-picker/constants'

function BaseCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 md:p-6 max-md:not-last:border-b md:not-last:border-r flex-1 w-full flex flex-col justify-center items-center gap-2 md:gap-3 relative min-h-[100px] md:h-45">
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
    <div className="flex md:flex-row flex-col items-center border-b w-full max-md:py-2">
      <BaseCard>
        <SemiLiveBadge className="absolute left-3 top-3 md:left-6 md:top-6" />
        <Suspense fallback={<Skeleton className="w-16 h-8" />}>
          <ConcurrentSandboxes params={params} />
        </Suspense>
        <BaseSubtitle>
          Concurrent Sandboxes <br className="max-md:hidden" />
          <span className="max-md:hidden">(5-sec avg)</span>
        </BaseSubtitle>
      </BaseCard>

      <BaseCard>
        <SemiLiveBadge className="absolute left-3 top-3 md:left-6 md:top-6" />
        <Suspense fallback={<Skeleton className="w-16 h-8" />}>
          <SandboxesStartRate params={params} />
        </Suspense>
        <BaseSubtitle>
          Start Rate per Second <br className="max-md:hidden" />
          <span className="max-md:hidden">(5-sec avg)</span>
        </BaseSubtitle>
      </BaseCard>

      <BaseCard>
        <Suspense fallback={<Skeleton className="w-16 h-8" />}>
          <MaxConcurrentSandboxes params={params} />
        </Suspense>
        <BaseSubtitle>
          Peak Concurrent Sandboxes
          <br className="max-md:hidden" />
          <span className="max-md:hidden">(30-day max)</span>
        </BaseSubtitle>
      </BaseCard>
    </div>
  )
}

// Components

export const ConcurrentSandboxes = async ({
  params,
}: {
  params: Promise<SandboxesMonitoringPageParams>
}) => {
  const { teamIdOrSlug } = await params
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  // use request-consistent timestamp for cache deduplication
  const now = getNowMemo()
  const start = now - 60_000

  const [teamMetricsResult, tierLimits] = await Promise.all([
    getTeamMetrics({
      teamId,
      startDate: start,
      endDate: now,
    }),
    getTeamTierLimits({ teamId }),
  ])

  if (!teamMetricsResult?.data || teamMetricsResult.serverError) {
    return (
      <BaseErrorTooltip>
        {teamMetricsResult?.serverError ||
          'Failed to load concurrent sandboxes'}
      </BaseErrorTooltip>
    )
  }

  return (
    <ConcurrentSandboxesClient
      initialData={teamMetricsResult.data}
      limit={tierLimits?.data?.concurrentInstances}
    />
  )
}

export const SandboxesStartRate = async ({
  params,
}: {
  params: Promise<SandboxesMonitoringPageParams>
}) => {
  const { teamIdOrSlug } = await params
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  // use same request-consistent timestamp as ConcurrentSandboxes
  const now = getNowMemo()
  const start = now - 60_000

  const teamMetricsResult = await getTeamMetrics({
    teamId,
    startDate: start,
    endDate: now,
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

  const end = Date.now()
  const start = end - (MAX_DAYS_AGO - 60_000) // 1 minute margin to avoid validation errors

  const [teamMetricsResult, tierLimits] = await Promise.all([
    getTeamMetricsMax({
      teamId,
      startDate: start,
      endDate: end,
      metric: 'concurrent_sandboxes',
    }),
    getTeamTierLimits({ teamId }),
  ])

  if (!teamMetricsResult?.data || teamMetricsResult.serverError) {
    return (
      <BaseErrorTooltip>
        {teamMetricsResult?.serverError ||
          'Failed to load max concurrent sandboxes'}
      </BaseErrorTooltip>
    )
  }

  const limit = tierLimits?.data?.concurrentInstances

  const concurrentSandboxes = teamMetricsResult.data.value

  return (
    <>
      <span className="prose-value-big mt-1">
        {formatNumber(concurrentSandboxes)}
      </span>
      {limit && (
        <span className="absolute right-3 bottom-1 md:right-6 md:bottom-4 prose-label text-fg-tertiary ">
          LIMIT: {formatNumber(limit)}
        </span>
      )}
    </>
  )
}
