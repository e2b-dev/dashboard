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
        cpuUsedPct: Number(metric.cpuUsedPct.toFixed(3)),
        memUsedMb: Number((metric.memUsed / 1024 / 1024).toFixed(3)),
        memTotalMb: Number((metric.memTotal / 1024 / 1024).toFixed(3)),
        timestamp: metric.timestamp,
      },
    ])
  )
}
