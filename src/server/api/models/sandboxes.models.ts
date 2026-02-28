import type { components as DashboardComponents } from '@/types/dashboard-api.types'
import type { components as InfraComponents } from '@/types/infra-api.types'

export type SandboxLogLevel = InfraComponents['schemas']['LogLevel']
export type SandboxDetailsState =
  | InfraComponents['schemas']['SandboxState']
  | 'killed'

interface SandboxDetailsBaseDTO {
  templateID: string
  alias?: string
  sandboxID: string
  startedAt: string
  domain?: string | null
  cpuCount: number
  memoryMB: number
  diskSizeMB: number
}

interface ActiveSandboxDetailsDTO extends SandboxDetailsBaseDTO {
  endAt: string
  envdVersion: string
  envdAccessToken?: string
  metadata?: InfraComponents['schemas']['SandboxMetadata']
  state: InfraComponents['schemas']['SandboxState']
}

interface KilledSandboxDetailsDTO extends SandboxDetailsBaseDTO {
  endAt: string
  stoppedAt: string
  state: 'killed'
}

export type SandboxDetailsDTO =
  | ActiveSandboxDetailsDTO
  | KilledSandboxDetailsDTO

export interface SandboxLogDTO {
  timestampUnix: number
  level: SandboxLogLevel
  message: string
}

export interface SandboxLogsDTO {
  logs: SandboxLogDTO[]
  nextCursor: number | null
}

// mappings

export function mapInfraSandboxLogToDTO(
  log: InfraComponents['schemas']['SandboxLogEntry']
): SandboxLogDTO {
  return {
    timestampUnix: new Date(log.timestamp).getTime(),
    level: log.level,
    message: log.message,
  }
}

export function mapInfraSandboxDetailsToDTO(
  sandbox: InfraComponents['schemas']['SandboxDetail']
): SandboxDetailsDTO {
  return {
    templateID: sandbox.templateID,
    alias: sandbox.alias,
    sandboxID: sandbox.sandboxID,
    startedAt: sandbox.startedAt,
    endAt: sandbox.endAt,
    envdVersion: sandbox.envdVersion,
    envdAccessToken: sandbox.envdAccessToken,
    domain: sandbox.domain,
    cpuCount: sandbox.cpuCount,
    memoryMB: sandbox.memoryMB,
    diskSizeMB: sandbox.diskSizeMB,
    metadata: sandbox.metadata,
    state: sandbox.state,
  }
}

export function mapDashboardSandboxDetailsToDTO(
  sandbox: DashboardComponents['schemas']['SandboxDetail']
): SandboxDetailsDTO {
  const stoppedAt = sandbox.stoppedAt ?? sandbox.startedAt

  return {
    templateID: sandbox.templateID,
    alias: sandbox.alias,
    sandboxID: sandbox.sandboxID,
    startedAt: sandbox.startedAt,
    endAt: stoppedAt,
    stoppedAt,
    domain: sandbox.domain,
    cpuCount: sandbox.cpuCount,
    memoryMB: sandbox.memoryMB,
    diskSizeMB: sandbox.diskSizeMB,
    state: 'killed',
  }
}
