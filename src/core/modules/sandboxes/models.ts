import type { components as ArgusComponents } from '@/contracts/argus-api'
import type { components as DashboardComponents } from '@/contracts/dashboard-api'
import type { components as InfraComponents } from '@/contracts/infra-api'

export type SandboxLogLevel = InfraComponents['schemas']['LogLevel']
export type Sandbox = InfraComponents['schemas']['ListedSandbox']
export type Sandboxes = InfraComponents['schemas']['ListedSandbox'][]
export type SandboxesMetricsRecord =
  InfraComponents['schemas']['SandboxesWithMetrics']['sandboxes']
export type TeamMetric = InfraComponents['schemas']['TeamMetric']
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
export type SandboxEventModel = ArgusComponents['schemas']['SandboxEvent']

export interface SandboxLifecycleModel {
  createdAt: string | null
  pausedAt: string | null
  endedAt: string | null
  events: SandboxEventModel[]
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

function sortEventsByTimestamp(
  events: SandboxEventModel[]
): SandboxEventModel[] {
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
  events: SandboxEventModel[]
): SandboxLifecycleModel {
  const lifecycleEvents = sortEventsByTimestamp(
    events.filter((event) =>
      event.type.startsWith(SANDBOX_LIFECYCLE_EVENT_PREFIX)
    )
  )

  let createdAt: string | null = null
  let pausedAt: string | null = null
  let endedAt: string | null = null

  for (const event of lifecycleEvents) {
    const timestampMs = parseEventTimestampMs(event.timestamp)
    if (timestampMs === null) {
      continue
    }

    if (event.type === SANDBOX_LIFECYCLE_CREATED_EVENT && createdAt === null) {
      createdAt = event.timestamp
      continue
    }

    if (event.type === SANDBOX_LIFECYCLE_PAUSED_EVENT) {
      pausedAt = event.timestamp
      continue
    }

    if (event.type === SANDBOX_LIFECYCLE_RESUMED_EVENT && pausedAt !== null) {
      const pausedAtMs = parseEventTimestampMs(pausedAt)
      if (pausedAtMs !== null && pausedAtMs <= timestampMs) {
        pausedAt = null
      }
      continue
    }

    if (event.type === SANDBOX_LIFECYCLE_KILLED_EVENT) {
      endedAt = event.timestamp
    }
  }

  return {
    createdAt,
    pausedAt,
    endedAt,
    events: lifecycleEvents,
  }
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
