'use client'

import { formatDecimal, formatNumber } from '@/lib/utils/formatting'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { AnimatedNumber } from '@/ui/primitives/animated-number'
import { InferSafeActionFnResult } from 'next-safe-action'
import { useMemo } from 'react'
import { NonUndefined } from 'react-hook-form'
import { useRecentMetrics } from './hooks/use-recent-metrics'

interface TeamMonitoringHeaderClientProps {
  initialData: NonUndefined<
    InferSafeActionFnResult<typeof getTeamMetrics>['data']
  >
  limit?: number
}

export function ConcurrentSandboxesClient({
  initialData,
  limit,
}: TeamMonitoringHeaderClientProps) {
  const { data } = useRecentMetrics({ initialData })

  const lastConcurrentSandboxes = formatNumber(
    data?.metrics?.[(data?.metrics?.length ?? 0) - 1]?.concurrentSandboxes ?? 0
  )

  return (
    <>
      <AnimatedNumber
        value={lastConcurrentSandboxes}
        className="prose-value-big mt-1"
      />
      {limit && (
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
