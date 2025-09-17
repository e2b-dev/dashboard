import { SandboxesMonitoringPageParams } from '@/app/dashboard/[teamIdOrSlug]/sandboxes/@monitoring/page'
import { fillTeamMetricsWithZeros } from '@/features/dashboard/sandboxes/monitoring/utils'
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

function BaseCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 md:p-6 max-md:not-last:border-b md:not-last:border-r h-full flex-1 w-full flex flex-col justify-center items-center gap-2 md:gap-3 relative max-md:min-h-[100px] md:min-h-[200px]">
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
    <div className="flex md:flex-row flex-col items-center border-b w-full md:min-h-52 max-md:py-2">
      <BaseCard>
        <SemiLiveBadge className="absolute left-3 top-3 md:left-6 md:top-6" />

        <Suspense fallback={<Skeleton className="w-16 h-8" />}>
          <SandboxesStartRate params={params} />
        </Suspense>
        <BaseSubtitle>
          Start Rate per Second <br className="max-md:hidden" />
          <span className="md:hidden">per sec</span>
          <span className="max-md:hidden">(5 sec average)</span>
        </BaseSubtitle>
      </BaseCard>

      <BaseCard>
        <SemiLiveBadge className="absolute left-3 top-3 md:left-6 md:top-6" />
        <Suspense fallback={<Skeleton className="w-16 h-8" />}>
          <ConcurrentSandboxes params={params} />
        </Suspense>
        <BaseSubtitle>
          Concurrent <span className="max-md:hidden">Sandboxes</span>{' '}
          <br className="max-md:hidden" />
          <span className="max-md:hidden">(5 sec average)</span>
        </BaseSubtitle>
      </BaseCard>

      <BaseCard>
        <Suspense fallback={<Skeleton className="w-16 h-8" />}>
          <MaxConcurrentSandboxes params={params} />
        </Suspense>
        <BaseSubtitle>
          Max<span className="max-md:hidden"> Concurrent Sandboxes</span>
          <span className="md:hidden"> Concurrent</span>
          <br className="max-md:hidden" />
          <span className="max-md:hidden">(Last 30 Days)</span>
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

  const filledMetrics = fillTeamMetricsWithZeros(
    teamMetricsResult.data.metrics,
    start,
    now,
    teamMetricsResult.data.step
  )

  const initialData = {
    ...teamMetricsResult.data,
    metrics: filledMetrics,
  }

  return (
    <ConcurrentSandboxesClient
      initialData={initialData}
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

  const filledMetrics = fillTeamMetricsWithZeros(
    teamMetricsResult.data.metrics,
    start,
    now,
    teamMetricsResult.data.step
  )
  const initialData = {
    ...teamMetricsResult.data,
    metrics: filledMetrics,
  }

  return <SandboxesStartRateClient initialData={initialData} />
}

export const MaxConcurrentSandboxes = async ({
  params,
}: {
  params: Promise<SandboxesMonitoringPageParams>
}) => {
  const { teamIdOrSlug } = await params
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  const end = Date.now()
  const start = end - 1000 * 60 * 60 * 24 * 30 // 30 days

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
      <span className="prose-value-big mt-4">
        {formatNumber(concurrentSandboxes)}
      </span>
      {limit && (
        <span className="absolute right-6 bottom-4 prose-label text-fg-tertiary ">
          LIMIT: {formatNumber(limit)}
        </span>
      )}
    </>
  )
}
