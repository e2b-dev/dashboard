import type { TeamMetric } from './models'

export type ClientTeamMetric = Pick<
  TeamMetric,
  'concurrentSandboxes' | 'sandboxStartRate'
> & {
  timestamp: number
}

export type ClientTeamMetrics = Array<ClientTeamMetric>

export type TeamMetricsResponse = {
  metrics: ClientTeamMetrics
  step: number
}
