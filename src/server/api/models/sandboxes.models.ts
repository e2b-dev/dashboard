import type { components } from '@/types/infra-api.types'

export type SandboxLogLevel = components['schemas']['LogLevel']

export interface SandboxLogDTO {
  timestampUnix: number
  level: SandboxLogLevel
  message: string
}

export interface SandboxLogsDTO {
  logs: SandboxLogDTO[]
  nextCursor: number | null
}

export interface SandboxMetricsDTO {
  metrics: components['schemas']['SandboxMetric'][]
}

// mappings

export function mapInfraSandboxLogToDTO(
  log: components['schemas']['SandboxLogEntry']
): SandboxLogDTO {
  return {
    timestampUnix: new Date(log.timestamp).getTime(),
    level: log.level,
    message: log.message,
  }
}
