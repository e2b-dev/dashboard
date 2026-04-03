'use client'

import type { InferSafeActionFnResult } from 'next-safe-action'
import { useMemo } from 'react'
import type { NonUndefined } from 'react-hook-form'
import type { getTeamMetrics } from '@/core/server/functions/sandboxes/get-team-metrics'
import { useDashboard } from '@/features/dashboard/context'
import { formatDecimal, formatNumber } from '@/lib/utils/formatting'
import { AnimatedNumber } from '@/ui/primitives/animated-number'
import { useRecentMetrics } from './hooks/use-recent-metrics'

interface TeamMonitoringHeaderClientProps {
  initialData: NonUndefined<
    InferSafeActionFnResult<typeof getTeamMetrics>['data']
  >
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
  concurrentSandboxes: number
}

export function MaxConcurrentSandboxesClient({
  concurrentSandboxes,
}: MaxConcurrentSandboxesClientProps) {
  const { team } = useDashboard()
  const limit = team.limits.concurrentSandboxes

  return (
    <>
      <span className="prose-value-big mt-1">
        {formatNumber(concurrentSandboxes)}
      </span>
      <span className="absolute right-3 bottom-1 md:right-6 md:bottom-4 prose-label text-fg-tertiary ">
        LIMIT: {formatNumber(limit)}
      </span>
    </>
  )
}
