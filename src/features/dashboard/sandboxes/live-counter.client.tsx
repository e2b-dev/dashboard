'use client'

import type { TeamMetricsResponse } from '@/core/modules/sandboxes/models.client'
import { LiveSandboxCounter } from './live-counter'
import { useRecentMetrics } from './monitoring/hooks/use-recent-metrics'

interface LiveSandboxCounterClientProps {
  initialData?: TeamMetricsResponse
  className?: string
}

export function LiveSandboxCounterClient({
  initialData,
  className,
}: LiveSandboxCounterClientProps) {
  const { data } = useRecentMetrics({
    initialData,
  })

  const latestMetric = data?.metrics.length
    ? data.metrics[data.metrics.length - 1]
    : undefined

  return (
    <LiveSandboxCounter
      count={latestMetric?.concurrentSandboxes}
      className={className}
    />
  )
}
