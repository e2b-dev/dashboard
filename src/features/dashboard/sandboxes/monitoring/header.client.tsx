'use client'

import { formatDecimal, formatNumber } from '@/lib/utils/formatting'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { InferSafeActionFnResult } from 'next-safe-action'
import { useMemo } from 'react'
import { NonUndefined } from 'react-hook-form'
import useHeaderMetricsSWR from './hooks/use-header-metrics-swr'

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
  const { data } = useHeaderMetricsSWR(initialData)

  const lastConcurrentSandboxes =
    data?.metrics?.[(data?.metrics?.length ?? 0) - 1]?.concurrentSandboxes ?? 0

  return (
    <>
      <span className="prose-value-big mt-1">
        {formatNumber(lastConcurrentSandboxes)}
      </span>
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
  const { data } = useHeaderMetricsSWR(initialData)

  const lastSandboxesStartRate = useMemo(() => {
    const rate =
      data?.metrics?.[(data?.metrics?.length ?? 0) - 1]?.sandboxStartRate ?? 0
    return formatDecimal(rate, 3)
  }, [data])

  return <span className="prose-value-big mt-1">{lastSandboxesStartRate}</span>
}
