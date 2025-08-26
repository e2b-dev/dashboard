'use client'

import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { InferSafeActionFnResult } from 'next-safe-action'
import { useMemo } from 'react'
import { useTeamMetrics } from './context'
import useTeamMetricsSWR from './hooks/use-team-metrics-swr'

interface TeamMonitoringHeaderClientProps {
  initialData: InferSafeActionFnResult<typeof getTeamMetrics>['data']
}

export function ConcurrentSandboxesClient({
  initialData,
}: TeamMonitoringHeaderClientProps) {
  const { chartsStart, chartsEnd } = useTeamMetrics()

  const { data } = useTeamMetricsSWR(initialData, {
    start: chartsStart,
    end: chartsEnd,
  })

  const lastConcurrentSandboxes =
    data?.[data.length - 1]?.concurrentSandboxes ?? 0

  return <span className="prose-value-big">{lastConcurrentSandboxes}</span>
}

export function SandboxesStartRateClient({
  initialData,
}: TeamMonitoringHeaderClientProps) {
  const { chartsStart, chartsEnd } = useTeamMetrics()

  const { data } = useTeamMetricsSWR(initialData, {
    start: chartsStart,
    end: chartsEnd,
  })

  const lastSandboxesStartRate = useMemo(() => {
    const rate = data?.[data.length - 1]?.sandboxStartRate ?? 0
    return Math.round(rate)
  }, [data])

  return <span className="prose-value-big">{lastSandboxesStartRate}</span>
}
