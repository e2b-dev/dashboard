import { Suspense } from 'react'
import { getTeamMetrics } from '@/core/server/functions/sandboxes/get-team-metrics'
import { getTeamMetricsMax } from '@/core/server/functions/sandboxes/get-team-metrics-max'
import { getNowMemo } from '@/lib/utils/server'
import ErrorTooltip from '@/ui/error-tooltip'
import { SemiLiveBadge } from '@/ui/live'
import { Skeleton } from '@/ui/primitives/skeleton'
import { WarningIcon } from '@/ui/primitives/icons'
import {
  ConcurrentSandboxesClient,
  MaxConcurrentSandboxesClient,
  SandboxesStartRateClient,
} from './header.client'
import { MAX_DAYS_AGO } from './time-picker/constants'

interface MonitoringContentParams {
  teamSlug: string
}

function BaseCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 md:p-6 max-md:not-last:border-b md:not-last:border-r flex-1 w-full flex flex-col justify-center items-center gap-2 md:gap-3 relative min-h-[100px] md:h-45">
      {children}
    </div>
  )
}

function BaseSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-fg-tertiary prose-label uppercase text-center">
      {children}
    </span>
  )
}

function BaseErrorTooltip({ children }: { children: React.ReactNode }) {
  return (
    <ErrorTooltip
      trigger={
        <span className="inline-flex items-center gap-2">
          <WarningIcon className="h-4 w-4 text-accent-error-highlight" />
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
  params: Promise<MonitoringContentParams>
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
  params: Promise<MonitoringContentParams>
}) => {
  const { teamSlug } = await params

  // use request-consistent timestamp for cache deduplication
  const now = getNowMemo()
  const start = now - 60_000

  const teamMetricsResult = await getTeamMetrics({
    teamSlug,
    startDate: start,
    endDate: now,
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
  params: Promise<MonitoringContentParams>
}) => {
  const { teamSlug } = await params

  // use same request-consistent timestamp as ConcurrentSandboxes
  const now = getNowMemo()
  const start = now - 60_000

  const teamMetricsResult = await getTeamMetrics({
    teamSlug,
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
  params: Promise<MonitoringContentParams>
}) => {
  const { teamSlug } = await params

  const end = Date.now()
  const start = end - (MAX_DAYS_AGO - 60_000) // 1 minute margin to avoid validation errors

  const teamMetricsResult = await getTeamMetricsMax({
    teamSlug,
    startDate: start,
    endDate: end,
    metric: 'concurrent_sandboxes',
  })

  if (!teamMetricsResult?.data || teamMetricsResult.serverError) {
    return (
      <BaseErrorTooltip>
        {teamMetricsResult?.serverError ||
          'Failed to load max concurrent sandboxes'}
      </BaseErrorTooltip>
    )
  }

  return (
    <MaxConcurrentSandboxesClient
      concurrentSandboxes={teamMetricsResult.data.value}
    />
  )
}
