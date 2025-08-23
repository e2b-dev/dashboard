"use client"

import useTeamMetricsSWR from "./hooks/use-team-metrics-swr"
import { InferSafeActionFnResult } from "next-safe-action"
import { getTeamMetrics } from "@/server/sandboxes/get-team-metrics"

interface ConcurrentSandboxesClientProps {
  initialData: InferSafeActionFnResult<typeof getTeamMetrics>['data']
}

export function ConcurrentSandboxesClient({ initialData }: ConcurrentSandboxesClientProps) {
  const { data } = useTeamMetricsSWR(initialData, { realtimeSyncRange: 15_000 })

  const lastConcurrentSandboxes = data?.[data.length - 1]?.concurrentSandboxes ?? 0

  return <span className="prose-value-big">{lastConcurrentSandboxes}</span>
}
