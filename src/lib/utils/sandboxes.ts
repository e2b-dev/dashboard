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
        cpuUsedPct: Number(metric.cpuUsedPct.toFixed(2)),
        memUsedMb: Number((metric.memUsed / 1024 / 1024).toFixed(2)),
        memTotalMb: Number((metric.memTotal / 1024 / 1024).toFixed(2)),
        diskUsedGb: Number((metric.diskUsed / 1024 / 1024 / 1024).toFixed(2)),
        diskTotalGb: Number((metric.diskTotal / 1024 / 1024 / 1024).toFixed(2)),
        timestamp: metric.timestamp,
      },
    ])
  )
}
