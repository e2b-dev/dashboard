export type ClientSandboxMetric = {
  cpuCount: number
  cpuUsedPct: number
  memUsedMb: number
  memTotalMb: number
  timestamp: string
}

export type ClientSandboxesMetrics = Record<string, ClientSandboxMetric>
