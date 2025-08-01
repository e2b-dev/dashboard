export type ClientSandboxMetric = {
  cpuCount: number
  cpuUsedPct: number
  memUsedMb: number
  memTotalMb: number
  timestamp: string
  diskUsedGb: number
  diskTotalGb: number
}

export type ClientSandboxesMetrics = Record<string, ClientSandboxMetric>
