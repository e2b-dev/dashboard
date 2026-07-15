import 'server-only'

import { Sandbox } from 'e2b'
import { authHeaders } from '@/configs/api'
import type { components as InfraComponents } from '@/contracts/infra-api'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import { infra } from '@/core/shared/clients/api'
import { l } from '@/core/shared/clients/logger/logger'
import { normalizeDevinApiUrl } from './client.server'

const ACTIVE_WORKER_TIMEOUT_MS = 24 * 60 * 60 * 1000
const API_REQUEST_TIMEOUT_MS = 10_000
const DISCONNECT_CONCURRENCY = 10
const DEFAULT_DEVIN_TEMPLATE = 'devin-outposts-worker'
const PREPARED_SANDBOX_TIMEOUT_MS = 30 * 60 * 1000
const WORKER_START_TIMEOUT_MS = 15_000

type WorkerIdentity = {
  accessToken: string
  operationId: string
  teamId: string
  userId: string
}

export type LaunchDevinWorkerInput = WorkerIdentity & {
  apiUrl: string
  outpostsToken: string
  poolId: string
}

type StartPreparedDevinWorkerInput = LaunchDevinWorkerInput & {
  activeTimeoutMs: number
  sandboxId: string
}

type PreparedWorkerIdentity = WorkerIdentity & {
  activeTimeoutMs: number
  sandboxId: string
}

type PreparedDevinWorker = {
  acceptorId: string
  sandboxId: string
  started: boolean
}

export type LaunchDevinWorkerResult = {
  acceptorId: string
  reused: boolean
  sandboxId: string
  workerPid: string | null
}

export class DevinWorkerLaunchError extends Error {
  constructor(readonly orphanedSandboxId?: string) {
    super('Failed to start the Devin Outposts worker')
  }
}

export async function launchDevinWorker(
  input: LaunchDevinWorkerInput
): Promise<LaunchDevinWorkerResult> {
  const activeTimeoutMs = await getActiveWorkerTimeoutMs(input)
  const existingSandboxId = await findWorkerSandbox(input)
  const prepared = existingSandboxId
    ? { sandboxId: existingSandboxId }
    : await prepareDevinWorkerSandbox(input)
  return startPreparedDevinWorker({
    ...input,
    activeTimeoutMs,
    sandboxId: prepared.sandboxId,
  })
}

export async function findStartedDevinWorker(input: WorkerIdentity) {
  const sandboxId = await findWorkerSandbox(input)
  if (!sandboxId) return null

  const activeTimeoutMs = await getActiveWorkerTimeoutMs(input)
  const sandbox = await connectWorkerSandbox(
    { ...input, sandboxId },
    PREPARED_SANDBOX_TIMEOUT_MS
  )
  if (!(await sandboxHasStartedWorker(sandbox, input.operationId))) return null
  await extendWorkerSandbox(
    { ...input, activeTimeoutMs, sandboxId },
    activeTimeoutMs
  )
  return sandboxId
}

export async function disconnectDevinWorkers(
  input: Pick<WorkerIdentity, 'accessToken' | 'teamId' | 'userId'>
) {
  const result = await listDisconnectableWorkerSandboxes(input)
  const sandboxIds = result.map((sandbox) => sandbox.sandboxID)
  let failed = false

  for (
    let index = 0;
    index < sandboxIds.length;
    index += DISCONNECT_CONCURRENCY
  ) {
    const deleted = await Promise.all(
      sandboxIds.slice(index, index + DISCONNECT_CONCURRENCY).map((sandboxId) =>
        cleanupPreparedDevinWorker({
          accessToken: input.accessToken,
          sandboxId,
          teamId: input.teamId,
        })
      )
    )
    failed ||= deleted.some((success) => !success)
  }

  if (failed) throw new DevinWorkerLaunchError()
  return { count: sandboxIds.length }
}

async function prepareDevinWorkerSandbox(
  input: WorkerIdentity
): Promise<PreparedDevinWorker> {
  const acceptorId = acceptorIdFor(input.operationId)

  try {
    const sandbox = await createWorkerSandbox(input)
    return { acceptorId, sandboxId: sandbox.sandboxID, started: false }
  } catch (error) {
    try {
      const recoveredSandboxId = await findWorkerSandbox(input)
      if (recoveredSandboxId) {
        return { acceptorId, sandboxId: recoveredSandboxId, started: false }
      }
    } catch {
      // Preserve the original create failure below.
    }

    l.warn(
      {
        key: 'devin:worker_sandbox_prepare_failed',
        context: {
          error_code: safeErrorCode(error),
          error_name: error instanceof Error ? error.name : 'unknown',
        },
        team_id: input.teamId,
        user_id: input.userId,
      },
      '[Devin] Failed to prepare worker sandbox'
    )
    throw new DevinWorkerLaunchError()
  }
}

async function persistPreparedDevinConnection(
  input: StartPreparedDevinWorkerInput
) {
  const sandbox = await connectWorkerSandbox(input, PREPARED_SANDBOX_TIMEOUT_MS)
  const [apiUrlPath, poolIdPath, tokenPath] = connectionFilePaths(
    input.operationId
  )
  const result = await sandbox.commands.run(
    [
      `mkdir -p ${shellQuote(stateDirFor(input.operationId))}`,
      'umask 077',
      `printf %s "$DEVIN_API_URL" > ${shellQuote(apiUrlPath)}`,
      `printf %s "$DEVIN_OUTPOST_POOL_ID" > ${shellQuote(poolIdPath)}`,
      `printf %s "$DEVIN_OUTPOSTS_TOKEN" > ${shellQuote(tokenPath)}`,
    ].join(' && '),
    {
      envs: {
        DEVIN_API_URL: normalizeDevinApiUrl(input.apiUrl),
        DEVIN_OUTPOSTS_TOKEN: input.outpostsToken,
        DEVIN_OUTPOST_POOL_ID: input.poolId,
      },
      requestTimeoutMs: API_REQUEST_TIMEOUT_MS,
    }
  )
  if (result.exitCode !== 0) throw new DevinWorkerLaunchError(input.sandboxId)
}

async function startPreparedDevinWorker(
  input: StartPreparedDevinWorkerInput
): Promise<LaunchDevinWorkerResult> {
  try {
    await persistPreparedDevinConnection(input)
  } catch {
    return cleanupFailedWorkerLaunch(input)
  }
  return startPersistedDevinWorker(input)
}

async function startPersistedDevinWorker(
  input: PreparedWorkerIdentity
): Promise<LaunchDevinWorkerResult> {
  const acceptorId = acceptorIdFor(input.operationId)
  const stateDir = stateDirFor(input.operationId)
  let sandbox: Sandbox | undefined

  try {
    sandbox = await connectWorkerSandbox(input, PREPARED_SANDBOX_TIMEOUT_MS)
    if (await sandboxHasStartedWorker(sandbox, input.operationId)) {
      return {
        acceptorId,
        reused: true,
        sandboxId: input.sandboxId,
        workerPid: null,
      }
    }

    const result = await sandbox.commands.run(
      [
        `mkdir -p ${shellQuote(stateDir)}`,
        ...connectionFilePaths(input.operationId).map(
          (path, index) =>
            `${['DEVIN_API_URL', 'DEVIN_OUTPOST_POOL_ID', 'DEVIN_OUTPOSTS_TOKEN'][index]}=$(cat ${shellQuote(path)})`
        ),
        'export DEVIN_API_URL DEVIN_OUTPOST_POOL_ID DEVIN_OUTPOSTS_TOKEN',
        `nohup devin worker start --api-url="$DEVIN_API_URL" --pool="$DEVIN_OUTPOST_POOL_ID" --acceptor-id=${shellQuote(acceptorId)} </dev/null > /home/user/devin-worker.log 2>&1 &`,
        'worker_pid=$!',
        'sleep 5',
        'kill -0 "$worker_pid" 2>/dev/null',
        `printf "%s" "$worker_pid" > ${shellQuote(workerMarkerPath(input.operationId))}`,
        'printf "%s" "$worker_pid"',
      ].join(' && '),
      {
        envs: {
          DEVIN_REMOTE_STATE_DIR: stateDir,
          DEVIN_WORKER_ACCEPTOR_ID: acceptorId,
        },
        requestTimeoutMs: WORKER_START_TIMEOUT_MS,
      }
    )
    if (result.exitCode !== 0 || !/^\d+$/.test(result.stdout.trim())) {
      throw new Error('worker_start_failed')
    }

    await extendWorkerSandbox(input, input.activeTimeoutMs)

    return {
      acceptorId,
      reused: false,
      sandboxId: input.sandboxId,
      workerPid: result.stdout.trim(),
    }
  } catch {
    return cleanupFailedWorkerLaunch(input)
  }
}

async function cleanupFailedWorkerLaunch(
  input: PreparedWorkerIdentity
): Promise<never> {
  const cleaned = await cleanupPreparedDevinWorker(input).catch(() => false)
  if (!cleaned) {
    l.error(
      {
        key: 'devin:worker_sandbox_cleanup_failed',
        sandbox_id: input.sandboxId,
        team_id: input.teamId,
        user_id: input.userId,
      },
      '[Devin] Failed to clean up worker sandbox after launch failure'
    )
  }
  throw new DevinWorkerLaunchError(cleaned ? undefined : input.sandboxId)
}

async function extendWorkerSandbox(
  input: PreparedWorkerIdentity,
  timeoutMs: number
) {
  const result = await infra.POST('/sandboxes/{sandboxID}/connect', {
    body: { timeout: millisecondsToSeconds(timeoutMs) },
    headers: authHeaders(input.accessToken, input.teamId),
    params: { path: { sandboxID: input.sandboxId } },
    signal: AbortSignal.timeout(API_REQUEST_TIMEOUT_MS),
  })
  if (!result.response.ok)
    throw new Error(`sandbox_connect_${result.response.status}`)
}

async function sandboxHasStartedWorker(sandbox: Sandbox, operationId: string) {
  const result = await sandbox.commands.run(
    [
      `if worker_pid=$(cat ${shellQuote(workerMarkerPath(operationId))} 2>/dev/null) && test -n "$worker_pid" && kill -0 "$worker_pid" 2>/dev/null; then`,
      '  printf running',
      'else',
      '  printf stopped',
      'fi',
    ].join('\n'),
    { requestTimeoutMs: API_REQUEST_TIMEOUT_MS }
  )
  const state = result.stdout.trim()
  if (result.exitCode !== 0 || !['running', 'stopped'].includes(state)) {
    throw new DevinWorkerLaunchError()
  }
  return state === 'running'
}

function cleanupPreparedDevinWorker(
  input: Pick<WorkerIdentity, 'accessToken' | 'teamId'> & { sandboxId: string }
) {
  return infra
    .DELETE('/sandboxes/{sandboxID}', {
      headers: authHeaders(input.accessToken, input.teamId),
      params: { path: { sandboxID: input.sandboxId } },
      signal: AbortSignal.timeout(API_REQUEST_TIMEOUT_MS),
    })
    .then(({ response }) => response.ok || response.status === 404)
}

function connectionOptions(accessToken: string, teamId: string) {
  return {
    apiUrl: process.env.NEXT_PUBLIC_INFRA_API_URL,
    domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
    apiHeaders: authHeaders(accessToken, teamId),
    requestTimeoutMs: API_REQUEST_TIMEOUT_MS,
  }
}

async function findWorkerSandbox(input: WorkerIdentity) {
  const sandboxes = await listWorkerSandboxes(input)
  return sandboxes.find(
    (sandbox) => sandbox.metadata?.devinLaunchOperationId === input.operationId
  )?.sandboxID
}

async function listWorkerSandboxes(
  input: Pick<WorkerIdentity, 'accessToken' | 'teamId' | 'userId'>
) {
  const metadata = new URLSearchParams({
    source: 'dashboard-devin-outposts',
    userId: input.userId,
  }).toString()
  const result = await infra.GET('/sandboxes', {
    headers: authHeaders(input.accessToken, input.teamId),
    params: { query: { metadata } },
    signal: AbortSignal.timeout(API_REQUEST_TIMEOUT_MS),
  })
  if (!result.response.ok || !result.data) {
    throw new DevinWorkerLaunchError()
  }
  return result.data
}

async function listDisconnectableWorkerSandboxes(
  input: Pick<WorkerIdentity, 'accessToken' | 'teamId' | 'userId'>
) {
  const metadata = new URLSearchParams({
    source: 'dashboard-devin-outposts',
    userId: input.userId,
  }).toString()
  const sandboxes: InfraComponents['schemas']['ListedSandbox'][] = []
  let nextToken: string | undefined

  do {
    const result = await infra.GET('/v2/sandboxes', {
      headers: authHeaders(input.accessToken, input.teamId),
      params: {
        query: {
          limit: 100,
          metadata,
          nextToken,
          state: ['running', 'paused'],
        },
      },
      signal: AbortSignal.timeout(API_REQUEST_TIMEOUT_MS),
    })
    if (!result.response.ok || !result.data) {
      throw new DevinWorkerLaunchError()
    }
    sandboxes.push(...result.data)
    nextToken = result.response.headers.get('X-Next-Token') || undefined
  } while (nextToken)

  return sandboxes
}

async function createWorkerSandbox(input: WorkerIdentity) {
  const result = await infra.POST('/sandboxes', {
    body: {
      autoPause: false,
      autoPauseMemory: true,
      autoResume: { enabled: false },
      metadata: launchMetadata(input.operationId, input.userId),
      secure: true,
      templateID: process.env.DEVIN_OUTPOSTS_TEMPLATE || DEFAULT_DEVIN_TEMPLATE,
      timeout: millisecondsToSeconds(PREPARED_SANDBOX_TIMEOUT_MS),
    },
    headers: authHeaders(input.accessToken, input.teamId),
    signal: AbortSignal.timeout(API_REQUEST_TIMEOUT_MS),
  })
  if (!result.response.ok || !result.data) {
    throw new Error(`sandbox_create_${result.response.status}`)
  }
  return result.data
}

async function getActiveWorkerTimeoutMs(
  input: Pick<WorkerIdentity, 'accessToken' | 'teamId'>
) {
  const teamsResult = await createUserTeamsRepository({
    accessToken: input.accessToken,
  }).listUserTeams()
  if (!teamsResult.ok) throw new DevinWorkerLaunchError()

  const maxLengthHours = teamsResult.data.find(
    (team) => team.id === input.teamId
  )?.limits.maxLengthHours
  if (!maxLengthHours || maxLengthHours <= 0) {
    throw new DevinWorkerLaunchError()
  }

  return Math.min(ACTIVE_WORKER_TIMEOUT_MS, maxLengthHours * 60 * 60 * 1000)
}

async function connectWorkerSandbox(
  input: Pick<WorkerIdentity, 'accessToken' | 'teamId'> & {
    sandboxId: string
  },
  timeoutMs: number
) {
  const result = await infra.POST('/sandboxes/{sandboxID}/connect', {
    body: { timeout: millisecondsToSeconds(timeoutMs) },
    headers: authHeaders(input.accessToken, input.teamId),
    params: { path: { sandboxID: input.sandboxId } },
    signal: AbortSignal.timeout(API_REQUEST_TIMEOUT_MS),
  })
  if (!result.response.ok || !result.data) {
    throw new Error(`sandbox_connect_${result.response.status}`)
  }
  return DevinWorkerSandbox.fromApi(result.data, input)
}

class DevinWorkerSandbox extends Sandbox {
  static fromApi(
    sandbox: InfraComponents['schemas']['Sandbox'],
    auth: Pick<WorkerIdentity, 'accessToken' | 'teamId'>
  ) {
    if (
      !sandbox.envdAccessToken ||
      !sandbox.envdVersion ||
      !sandbox.sandboxID
    ) {
      throw new Error('sandbox_connect_invalid_response')
    }
    return new DevinWorkerSandbox({
      ...connectionOptions(auth.accessToken, auth.teamId),
      envdAccessToken: sandbox.envdAccessToken,
      envdVersion: sandbox.envdVersion,
      sandboxDomain: sandbox.domain || undefined,
      sandboxId: sandbox.sandboxID,
      trafficAccessToken: sandbox.trafficAccessToken || undefined,
    })
  }
}

function millisecondsToSeconds(milliseconds: number) {
  return Math.ceil(milliseconds / 1000)
}

function acceptorIdFor(operationId: string) {
  return `e2b-dashboard-${operationId.replaceAll('-', '').slice(0, 16)}`
}

function stateDirFor(operationId: string) {
  return `/home/user/.devin/worker/sessions/${acceptorIdFor(operationId)}`
}

function workerMarkerPath(operationId: string) {
  return `${stateDirFor(operationId)}/worker.pid`
}

function connectionFilePaths(operationId: string): [string, string, string] {
  const stateDir = stateDirFor(operationId)
  return [
    `${stateDir}/api-url`,
    `${stateDir}/pool-id`,
    `${stateDir}/outposts-token`,
  ]
}

function launchMetadata(operationId: string, userId: string) {
  return {
    devinLaunchOperationId: operationId,
    source: 'dashboard-devin-outposts',
    userId,
  }
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`
}

function safeErrorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error))
    return undefined
  const code = error.code
  return typeof code === 'string' || typeof code === 'number' ? code : undefined
}
