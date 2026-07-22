import type { components as DashboardComponents } from '@/contracts/dashboard-api'
import type { components as InfraComponents } from '@/contracts/infra-api'

export type SandboxLogLevel = InfraComponents['schemas']['LogLevel']
export type Sandbox = InfraComponents['schemas']['ListedSandbox']
export type Sandboxes = InfraComponents['schemas']['ListedSandbox'][]
export type SandboxState = InfraComponents['schemas']['SandboxState']
export type SandboxesMetricsRecord =
  InfraComponents['schemas']['SandboxesWithMetrics']['sandboxes']
export type SandboxInfo = InfraComponents['schemas']['SandboxDetail']

interface SandboxDetailsBaseModel {
  templateID: string
  alias?: string
  sandboxID: string
  startedAt: string
  domain?: string | null
  cpuCount: number
  memoryMB: number
  diskSizeMB: number
  lifecycle?: SandboxLifecycleModel
}

interface ActiveSandboxDetailsModel extends SandboxDetailsBaseModel {
  endAt: string
  envdVersion: string
  envdAccessToken?: string
  metadata?: InfraComponents['schemas']['SandboxMetadata']
  state: InfraComponents['schemas']['SandboxState']
}

interface KilledSandboxDetailsModel extends SandboxDetailsBaseModel {
  endAt: string | null
  stoppedAt: string | null
  state: 'killed'
}

export type SandboxDetailsModel =
  | ActiveSandboxDetailsModel
  | KilledSandboxDetailsModel

export interface SandboxLogModel {
  timestampUnix: number
  level: SandboxLogLevel
  message: string
}

export interface SandboxLogsModel {
  logs: SandboxLogModel[]
  nextCursor: number | null
}

export type SandboxMetric = InfraComponents['schemas']['SandboxMetric']

// OSS: sandbox lifecycle events (argus) are not available; the shape is kept
// for parity with console. `lifecycle.events` is always empty here.
export interface SandboxEventModel {
  id: string
  timestamp: string
  type: string
}

export interface SandboxLifecycleModel {
  createdAt: string | null
  pausedAt: string | null
  endedAt: string | null
  events: SandboxEventModel[]
}

// mappings

export function mapInfraSandboxLogToModel(
  log: InfraComponents['schemas']['SandboxLogEntry']
): SandboxLogModel {
  return {
    timestampUnix: new Date(log.timestamp).getTime(),
    level: log.level,
    message: log.message,
  }
}

export function mapInfraSandboxDetailsToModel(
  sandbox: InfraComponents['schemas']['SandboxDetail']
): SandboxDetailsModel {
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

export function mapApiSandboxRecordToModel(
  sandbox: DashboardComponents['schemas']['SandboxRecord']
): KilledSandboxDetailsModel {
  const stoppedAt = sandbox.stoppedAt ?? null

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
