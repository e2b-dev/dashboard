'use client'

import { ClientTeamMetrics } from '@/types/sandboxes.types'
import { useMemo } from 'react'
import { useTeamMetrics } from './context'
import useTeamMetricsSWR from './hooks/use-team-metrics-swr'

interface TeamMonitoringHeaderClientProps {
  initialData: ClientTeamMetrics
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
    return Math.round(rate * 100) / 100
  }, [data])

  return <span className="prose-value-big">{lastSandboxesStartRate}</span>
}
