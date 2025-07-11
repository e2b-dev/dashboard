import { SandboxesMetricsRecord } from '@/types/api'
import { ClientSandboxesMetrics } from '@/types/sandboxes.types'

export function transformMetricsToClientMetrics(
  metrics: SandboxesMetricsRecord
): ClientSandboxesMetrics {
  return Object.fromEntries(
    Object.entries(metrics).map(([sandboxID, metric]) => [
      sandboxID,
      {
        cpuCount: metric.cpuCount,
        cpuUsedPct: metric.cpuUsedPct,
        memUsedMb: metric.memUsed / 1024 / 1024,
        memTotalMb: metric.memTotal / 1024 / 1024,
        timestamp: metric.timestamp,
      },
    ])
  )
}
