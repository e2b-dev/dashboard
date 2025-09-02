'use client'

import { TEAM_METRICS_INITIAL_RANGE_MS } from '@/configs/intervals'
import { ClientTeamMetrics } from '@/types/sandboxes.types'
import { useMemo } from 'react'
import useTeamMetricsSWR from './hooks/use-team-metrics-swr'

interface TeamMonitoringHeaderClientProps {
  initialData: ClientTeamMetrics
}

export function ConcurrentSandboxesClient({
  initialData,
}: TeamMonitoringHeaderClientProps) {
  const { data } = useTeamMetricsSWR(initialData, {
    mode: 'live',
    range: TEAM_METRICS_INITIAL_RANGE_MS,
  })

  const lastConcurrentSandboxes =
    data?.[data.length - 1]?.concurrentSandboxes ?? 0

  return <span className="prose-value-big">{lastConcurrentSandboxes}</span>
}

export function SandboxesStartRateClient({
  initialData,
}: TeamMonitoringHeaderClientProps) {
  const { data } = useTeamMetricsSWR(initialData, {
    mode: 'live',
    range: TEAM_METRICS_INITIAL_RANGE_MS,
  })

  const lastSandboxesStartRate = useMemo(() => {
    const rate = data?.[data.length - 1]?.sandboxStartRate ?? 0
    return Math.round(rate * 100) / 100
  }, [data])

  return <span className="prose-value-big">{lastSandboxesStartRate}</span>
}
