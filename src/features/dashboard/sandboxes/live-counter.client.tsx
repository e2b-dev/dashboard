'use client'

import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import { InferSafeActionFnResult } from 'next-safe-action'
import { NonUndefined } from 'react-hook-form'
import { LiveSandboxCounter } from './live-counter'
import { useRecentMetrics } from './monitoring/hooks/use-recent-metrics'

interface LiveSandboxCounterClientProps {
  initialData: NonUndefined<
    InferSafeActionFnResult<typeof getTeamMetrics>['data']
  >
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
