'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { TeamMetricsResponse } from '@/core/modules/sandboxes/models.client'
import { useDashboard } from '@/features/dashboard/context'
import { formatDecimal, formatNumber } from '@/lib/utils/formatting'
import { useTRPCClient } from '@/trpc/client'
import { AnimatedNumber } from '@/ui/primitives/animated-number'
import { useRecentMetrics } from './hooks/use-recent-metrics'
import { MAX_DAYS_AGO } from './time-picker/constants'

const MAX_CONCURRENT_SANDBOXES_REFRESH_MS = 5 * 60 * 1000

interface TeamMonitoringHeaderClientProps {
  initialData?: TeamMetricsResponse
}

function getLatestMetric(data: TeamMetricsResponse | undefined) {
  if (!data?.metrics.length) return undefined
  return data.metrics[data.metrics.length - 1]
}

export function ConcurrentSandboxesClient({
  initialData,
}: TeamMonitoringHeaderClientProps) {
  const { team } = useDashboard()
  const { data } = useRecentMetrics({ initialData })
  const limit = team.limits.concurrentSandboxes
  const latestMetric = getLatestMetric(data)

  const lastConcurrentSandboxes =
    latestMetric === undefined
      ? '—'
      : formatNumber(latestMetric.concurrentSandboxes)

  return (
    <>
      <AnimatedNumber
        value={lastConcurrentSandboxes}
        className="prose-value-big mt-1"
      />
      {!!limit && (
        <span className="absolute right-3 bottom-3 md:right-6 md:bottom-4 text-fg-tertiary prose-label">
          LIMIT: {formatNumber(limit)}
        </span>
      )}
    </>
  )
}

export function SandboxesStartRateClient({
  initialData,
}: TeamMonitoringHeaderClientProps) {
  const { data } = useRecentMetrics({ initialData })

  const lastSandboxesStartRate = useMemo(() => {
    const latestMetric = getLatestMetric(data)
    return latestMetric === undefined
      ? '—'
      : formatDecimal(latestMetric.sandboxStartRate, 3)
  }, [data])

  return (
    <AnimatedNumber
      value={lastSandboxesStartRate}
      className="prose-value-big mt-1"
    />
  )
}

interface MaxConcurrentSandboxesClientProps {
  concurrentSandboxes?: number
}

export function MaxConcurrentSandboxesClient({
  concurrentSandboxes,
}: MaxConcurrentSandboxesClientProps = {}) {
  const { team } = useDashboard()
  const trpcClient = useTRPCClient()
  const limit = team.limits.concurrentSandboxes

  const { data } = useQuery({
    queryKey: [
      'sandboxes.getTeamMetricsMax',
      team.slug,
      'concurrent_sandboxes',
    ],
    queryFn: () => {
      const end = Date.now()
      return trpcClient.sandboxes.getTeamMetricsMax.query({
        teamSlug: team.slug,
        startDate: end - (MAX_DAYS_AGO - 60_000),
        endDate: end,
        metric: 'concurrent_sandboxes',
      })
    },
    refetchInterval: MAX_CONCURRENT_SANDBOXES_REFRESH_MS,
    refetchIntervalInBackground: false,
  })

  const displayedConcurrentSandboxes = concurrentSandboxes ?? data?.value

  return (
    <>
      <span className="prose-value-big mt-1">
        {displayedConcurrentSandboxes === undefined
          ? '—'
          : formatNumber(displayedConcurrentSandboxes)}
      </span>
      <span className="absolute right-3 bottom-1 md:right-6 md:bottom-4 prose-label text-fg-tertiary ">
        LIMIT: {formatNumber(limit)}
      </span>
    </>
  )
}
