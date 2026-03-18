import type { TeamMetric } from './models'

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

export type ClientTeamMetric = Pick<
  TeamMetric,
  'concurrentSandboxes' | 'sandboxStartRate'
> & {
  timestamp: number
}

export type ClientTeamMetrics = Array<ClientTeamMetric>
