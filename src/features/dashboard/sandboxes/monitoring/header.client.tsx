'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { TeamMetricsResponse } from '@/core/modules/sandboxes/models.client'
import { useDashboard } from '@/features/dashboard/context'
import { formatDecimal, formatNumber } from '@/lib/utils/formatting'
import { useTRPC } from '@/trpc/client'
import { AnimatedNumber } from '@/ui/primitives/animated-number'
import { useRecentMetrics } from './hooks/use-recent-metrics'
import { MAX_DAYS_AGO } from './time-picker/constants'

interface TeamMonitoringHeaderClientProps {
  initialData?: TeamMetricsResponse
}

export function ConcurrentSandboxesClient({
  initialData,
}: TeamMonitoringHeaderClientProps) {
  const { team } = useDashboard()
  const { data } = useRecentMetrics({ initialData })
  const limit = team.limits.concurrentSandboxes

  const lastConcurrentSandboxes = formatNumber(
    data?.metrics?.[(data?.metrics?.length ?? 0) - 1]?.concurrentSandboxes ?? 0
  )

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
    const rate =
      data?.metrics?.[(data?.metrics?.length ?? 0) - 1]?.sandboxStartRate ?? 0
    return formatDecimal(rate, 3)
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
  const trpc = useTRPC()
  const limit = team.limits.concurrentSandboxes
  const maxRange = useMemo(() => {
    const end = Date.now()
    return {
      start: end - (MAX_DAYS_AGO - 60_000),
      end,
    }
  }, [])
  const { data } = useQuery(
    trpc.sandboxes.getTeamMetricsMax.queryOptions({
      teamSlug: team.slug,
      startDate: maxRange.start,
      endDate: maxRange.end,
      metric: 'concurrent_sandboxes',
    })
  )

  return (
    <>
      <span className="prose-value-big mt-1">
        {formatNumber(concurrentSandboxes ?? data?.value ?? 0)}
      </span>
      <span className="absolute right-3 bottom-1 md:right-6 md:bottom-4 prose-label text-fg-tertiary ">
        LIMIT: {formatNumber(limit)}
      </span>
    </>
  )
}
