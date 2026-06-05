'use client'

import type { TRPCRouterOutputs } from '@/trpc/client'
import { LiveSandboxCounter } from './live-counter'
import { useRecentMetrics } from './monitoring/hooks/use-recent-metrics'

interface LiveSandboxCounterClientProps {
  initialData: TRPCRouterOutputs['sandboxes']['getTeamMetrics']
  className?: string
}

export function LiveSandboxCounterClient({
  initialData,
  className,
}: LiveSandboxCounterClientProps) {
  const { data } = useRecentMetrics({
    initialData,
  })

  const lastConcurrentSandboxes =
    data?.metrics?.[(data?.metrics?.length ?? 0) - 1]?.concurrentSandboxes ?? 0

  return (
    <LiveSandboxCounter count={lastConcurrentSandboxes} className={className} />
  )
}
