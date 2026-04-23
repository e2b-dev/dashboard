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
  logger?: string
  message: string
  origin?: 'user' | 'platform'
  capturedBy?: {
    logger?: string
    message?: string
    event_type?: string
  }
  fields?: Record<string, unknown>
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
  let lastEvent: SandboxEventModel | null = null

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

const LOG_LEVEL_ALIASES: Record<string, SandboxLogLevel> = {
  trace: 'debug',
  debug: 'debug',
  info: 'info',
  warning: 'warn',
  warn: 'warn',
  error: 'error',
  fatal: 'error',
  panic: 'error',
}

const PROMOTED_DATA_FIELDS = new Set([
  'level',
  'severity',
  'logger',
  'name',
  'message',
  'msg',
])

function getStringField(value: unknown) {
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined
}

function normalizeLogLevel(value?: string) {
  if (!value) return undefined

  return LOG_LEVEL_ALIASES[value.toLowerCase()]
}

interface ParsedDataField {
  fields?: Record<string, unknown>
  level?: SandboxLogLevel
  logger?: string
  message?: string
}

function visibleDataFields(data: Record<string, unknown>) {
  const visibleEntries = Object.entries(data).filter(
    ([key]) => !PROMOTED_DATA_FIELDS.has(key)
  )

  return visibleEntries.length > 0
    ? Object.fromEntries(visibleEntries)
    : undefined
}

function parseJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return undefined
    }

    return parsed as Record<string, unknown>
  } catch {
    return undefined
  }
}

function parseJsonLineObjects(value: string) {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length <= 1) {
    return undefined
  }

  const parsedLines: Record<string, unknown>[] = []
  for (const line of lines) {
    const parsed = parseJsonObject(line)
    if (!parsed) {
      return undefined
    }

    parsedLines.push(parsed)
  }

  return parsedLines
}

function parseDataObject(data: Record<string, unknown>): ParsedDataField {
  return {
    fields: visibleDataFields(data),
    level: normalizeLogLevel(
      getStringField(data.level) ?? getStringField(data.severity)
    ),
    logger: getStringField(data.logger) ?? getStringField(data.name),
    message: getStringField(data.message) ?? getStringField(data.msg),
  }
}

function parseDataFields(value?: string): ParsedDataField[] | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined

  const jsonLines = parseJsonLineObjects(trimmed)
  if (jsonLines) {
    return jsonLines.map(parseDataObject)
  }

  try {
    const parsed = JSON.parse(trimmed)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return [{ fields: { data: parsed } }]
    }

    return [parseDataObject(parsed as Record<string, unknown>)]
  } catch {
    return [{ fields: { data: trimmed } }]
  }
}

function isCapturedUserLog(log: InfraComponents['schemas']['SandboxLogEntry']) {
  return Boolean(
    getStringField(log.fields.captured_by_logger) ||
      getStringField(log.fields.captured_by_message) ||
      getStringField(log.fields.captured_by_event_type) ||
      getStringField(log.fields.event_type) === 'stdout' ||
      getStringField(log.fields.event_type) === 'stderr' ||
      (getStringField(log.fields.logger) === 'process' &&
        getStringField(log.message) === 'Streaming process event')
  )
}

function getCapturedBy(log: InfraComponents['schemas']['SandboxLogEntry']) {
  if (!isCapturedUserLog(log)) {
    return undefined
  }

  const capturedBy = {
    logger:
      getStringField(log.fields.captured_by_logger) ??
      getStringField(log.fields.logger),
    message:
      getStringField(log.fields.captured_by_message) ??
      getStringField(log.message),
    event_type:
      getStringField(log.fields.captured_by_event_type) ??
      getStringField(log.fields.event_type),
  }

  return Object.values(capturedBy).some(Boolean) ? capturedBy : undefined
}

export function mapInfraSandboxLogToModels(
  log: InfraComponents['schemas']['SandboxLogEntry']
): SandboxLogModel[] {
  const parsedDataFields = parseDataFields(log.fields.data)
  if (!parsedDataFields) {
    return [
      {
        timestampUnix: new Date(log.timestamp).getTime(),
        level: log.level,
        logger: log.fields.logger,
        message: log.message,
        fields: undefined,
      },
    ]
  }

  const capturedBy = getCapturedBy(log)
  const origin = capturedBy ? 'user' : undefined

  return parsedDataFields.map((data) => ({
    timestampUnix: new Date(log.timestamp).getTime(),
    level: data?.level ?? log.level,
    logger: data?.logger ?? (origin ? undefined : log.fields.logger),
    message: data?.message ?? log.message,
    origin,
    capturedBy,
    fields: data?.fields,
  }))
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
