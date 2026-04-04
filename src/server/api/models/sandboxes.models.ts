import type { components as ArgusComponents } from '@/types/argus-api.types'
import type { components as DashboardComponents } from '@/types/dashboard-api.types'
import type { components as InfraComponents } from '@/types/infra-api.types'

export type SandboxLogLevel = InfraComponents['schemas']['LogLevel']

interface SandboxDetailsBaseDTO {
  templateID: string
  alias?: string
  sandboxID: string
  startedAt: string
  domain?: string | null
  cpuCount: number
  memoryMB: number
  diskSizeMB: number
  lifecycle?: SandboxLifecycleDTO
}

interface ActiveSandboxDetailsDTO extends SandboxDetailsBaseDTO {
  endAt: string
  envdVersion: string
  envdAccessToken?: string
  metadata?: InfraComponents['schemas']['SandboxMetadata']
  state: InfraComponents['schemas']['SandboxState']
}

interface KilledSandboxDetailsDTO extends SandboxDetailsBaseDTO {
  endAt: string | null
  stoppedAt: string | null
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

export type SandboxMetric = InfraComponents['schemas']['SandboxMetric']
export type SandboxEventDTO = ArgusComponents['schemas']['SandboxEvent']

export interface SandboxLifecycleDTO {
  createdAt: string | null
  pausedAt: string | null
  endedAt: string | null
  events: SandboxEventDTO[]
}

const SANDBOX_LIFECYCLE_EVENT_PREFIX = 'sandbox.lifecycle.'
const SANDBOX_LIFECYCLE_CREATED_EVENT = 'sandbox.lifecycle.created'
const SANDBOX_LIFECYCLE_PAUSED_EVENT = 'sandbox.lifecycle.paused'
const SANDBOX_LIFECYCLE_RESUMED_EVENT = 'sandbox.lifecycle.resumed'
const SANDBOX_LIFECYCLE_KILLED_EVENT = 'sandbox.lifecycle.killed'

function parseEventTimestampMs(value: string): number | null {
  if (!value) {
    return null
  }

  const timestampMs = new Date(value).getTime()
  if (!Number.isFinite(timestampMs)) {
    return null
  }

  return timestampMs
}

function sortEventsByTimestamp(events: SandboxEventDTO[]): SandboxEventDTO[] {
  return [...events].sort((a, b) => {
    const timestampA =
      parseEventTimestampMs(a.timestamp) ?? Number.MAX_SAFE_INTEGER
    const timestampB =
      parseEventTimestampMs(b.timestamp) ?? Number.MAX_SAFE_INTEGER
    if (timestampA !== timestampB) {
      return timestampA - timestampB
    }

    return a.id.localeCompare(b.id)
  })
}

export function deriveSandboxLifecycleFromEvents(
  events: SandboxEventDTO[]
): SandboxLifecycleDTO {
  const lifecycleEvents = sortEventsByTimestamp(
    events.filter((event) =>
      event.type.startsWith(SANDBOX_LIFECYCLE_EVENT_PREFIX)
    )
  )

  let createdAt: string | null = null
  let pausedAt: string | null = null
  let endedAt: string | null = null
  let lastEvent: SandboxEventDTO | null = null

  for (const event of lifecycleEvents) {
    const timestampMs = parseEventTimestampMs(event.timestamp)
    if (timestampMs === null) {
      continue
    }

    if (event.type === SANDBOX_LIFECYCLE_CREATED_EVENT && createdAt === null) {
      createdAt = event.timestamp
    }

    lastEvent = event
  }

  if (lastEvent?.type === SANDBOX_LIFECYCLE_PAUSED_EVENT) {
    pausedAt = lastEvent.timestamp
  }

  if (lastEvent?.type === SANDBOX_LIFECYCLE_KILLED_EVENT) {
    endedAt = lastEvent.timestamp
  }

  return {
    createdAt,
    pausedAt,
    endedAt,
    events: lifecycleEvents,
  }
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

export function mapApiSandboxRecordToDTO(
  sandbox: DashboardComponents['schemas']['SandboxRecord']
): KilledSandboxDetailsDTO {
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
