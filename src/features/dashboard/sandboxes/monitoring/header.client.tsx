'use client'

import { formatNumber } from '@/lib/utils/formatting'
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
    data?.metrics[data.metrics.length - 1]?.concurrentSandboxes ?? 0

  return (
    <>
      <span className="prose-value-big">
        {formatNumber(lastConcurrentSandboxes)}
      </span>
      {limit && (
        <span className="absolute right-6 bottom-4 text-fg-tertiary prose-label">
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
    const rate = data?.metrics[data.metrics.length - 1]?.sandboxStartRate ?? 0
    return Math.round(rate * 100) / 100
  }, [data])

  return <span className="prose-value-big">{lastSandboxesStartRate}</span>
}
