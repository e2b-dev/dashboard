import { TeamMetric } from './api'

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

export type ClientTeamMetric = Omit<TeamMetric, 'timestamp'> & {
  timestamp: number // unix timestamp in milliseconds
}

export type ClientTeamMetrics = Array<ClientTeamMetric>
