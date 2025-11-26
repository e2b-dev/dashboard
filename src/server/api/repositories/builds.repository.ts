import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import z from 'zod'
import {
  ListedBuildDTO,
  mapDatabaseBuildReasonToListedBuildDTOStatusMessage,
  mapDatabaseBuildStatusToBuildStatusDTO,
  mapDatabaseBuildToListedBuildDTO,
  type BuildStatusDB,
  type RunningBuildStatusDTO,
} from '../models/builds.models'

// helpers

function isUUID(value: string): boolean {
  return z.uuid().safeParse(value).success
}

export async function resolveTemplateId(
  templateIdOrAlias: string,
  teamId: string
): Promise<string | null> {
  const { data: envById } = await supabaseAdmin
    .from('envs')
    .select('id')
    .eq('id', templateIdOrAlias)
    .eq('team_id', teamId)
    .maybeSingle()

  if (envById) return envById.id

  const { data: envByAlias } = await supabaseAdmin
    .from('env_aliases')
    .select('env_id, envs!inner(team_id)')
    .eq('alias', templateIdOrAlias)
    .eq('envs.team_id', teamId)
    .maybeSingle()

  return envByAlias?.env_id ?? null
}

// list builds

const TEMPLATE_BUILD_TIMEOUT_MS =
  1000 * 60 * 60 + 1000 * 60 * 10 /* 1 hour + 10 minutes margin */

interface ListBuildsPaginationOptions {
  limit?: number
  cursor?: string
  direction?: 'forward' | 'backward'
}

interface PaginationCursor {
  timestamp: string
  direction: 'forward' | 'backward'
}

interface ListBuildsPaginatedResult<T> {
  data: T[]
  nextCursor: PaginationCursor | null
  previousCursor: PaginationCursor | null
  hasMore: boolean
}

export async function listBuilds(
  teamId: string,
  buildIdOrTemplate?: string,
  statuses: BuildStatusDB[] = ['waiting', 'building', 'uploaded', 'failed'],
  options: ListBuildsPaginationOptions = {}
): Promise<ListBuildsPaginatedResult<ListedBuildDTO>> {
  const limit = options.limit ?? 50

  const buildTimeoutAgo = new Date(
    Date.now() - TEMPLATE_BUILD_TIMEOUT_MS
  ).toISOString()

  const runningStatuses = statuses.filter(
    (s) => s === 'waiting' || s === 'building'
  )
  const completedStatuses = statuses.filter(
    (s) => s === 'uploaded' || s === 'failed'
  )

  let statusFilter: string
  if (runningStatuses.length > 0 && completedStatuses.length > 0) {
    statusFilter = `status.in.(${completedStatuses.join(',')}),and(status.in.(${runningStatuses.join(',')}),created_at.gte.${buildTimeoutAgo})`
  } else if (runningStatuses.length > 0) {
    statusFilter = `and(status.in.(${runningStatuses.join(',')}),created_at.gte.${buildTimeoutAgo})`
  } else {
    statusFilter = `status.in.(${completedStatuses.join(',')})`
  }

  const isBackward = options.direction === 'backward'

  // For backward pagination (fetching newer items), we need to:
  // 1. Use gt() to get items newer than cursor
  // 2. Order ascending to get items closest to cursor first
  // 3. Reverse results to maintain descending order (newest first)
  const orderAscending = isBackward

  let query = supabaseAdmin
    .from('env_builds')
    .select(
      `
      id,
      env_id,
      status,
      reason,
      created_at,
      finished_at,
      envs!inner(
        id,
        team_id,
        env_aliases(alias)
      )
    `
    )
    .eq('envs.team_id', teamId)
    .or(statusFilter)
    .order('created_at', { ascending: orderAscending })
    .order('id', { ascending: orderAscending })

  if (buildIdOrTemplate) {
    const resolvedEnvId = await resolveTemplateId(buildIdOrTemplate, teamId)
    const isBuildUUID = isUUID(buildIdOrTemplate)

    if (!resolvedEnvId && !isBuildUUID) {
      return {
        data: [],
        nextCursor: null,
        previousCursor: null,
        hasMore: false,
      }
    }

    if (resolvedEnvId && isBuildUUID) {
      query = query.or(`env_id.eq.${resolvedEnvId},id.eq.${buildIdOrTemplate}`)
    } else if (resolvedEnvId) {
      query = query.eq('env_id', resolvedEnvId)
    } else if (isBuildUUID) {
      query = query.eq('id', buildIdOrTemplate)
    }
  }

  if (options.cursor) {
    if (isBackward) {
      query = query.gt('created_at', options.cursor)
    } else {
      query = query.lt('created_at', options.cursor)
    }
  }

  query.limit(limit + 1)

  const { data: rawBuilds, error } = await query

  if (error) {
    throw error
  }

  if (!rawBuilds || rawBuilds.length === 0) {
    return {
      data: [],
      nextCursor: null,
      previousCursor: null,
      hasMore: false,
    }
  }

  // For backward pagination, reverse to maintain newest-first order
  if (isBackward) {
    rawBuilds.reverse()
  }

  const hasMore = rawBuilds.length > limit
  const trimmedRawBuilds = hasMore ? rawBuilds.slice(0, limit) : rawBuilds
  const builds = trimmedRawBuilds.map(mapDatabaseBuildToListedBuildDTO)

  const firstTimestamp = trimmedRawBuilds[0]?.created_at
  const lastTimestamp = trimmedRawBuilds[trimmedRawBuilds.length - 1]?.created_at

  // nextCursor: for fetching older builds (forward direction)
  // Available when there are more older items OR when we paginated backward
  // (meaning there are older items we came from)
  const nextCursor: PaginationCursor | null =
    (hasMore && !isBackward) || (isBackward && options.cursor)
      ? lastTimestamp
        ? { timestamp: lastTimestamp, direction: 'forward' }
        : null
      : null

  // previousCursor: for fetching newer builds (backward direction)
  // Available when we navigated forward (older) and there might be newer items,
  // OR when backward pagination found more items
  const previousCursor: PaginationCursor | null =
    (options.cursor && !isBackward) || (hasMore && isBackward)
      ? firstTimestamp
        ? { timestamp: firstTimestamp, direction: 'backward' }
        : null
      : null

  return {
    data: builds,
    nextCursor,
    previousCursor,
    hasMore,
  }
}

// get running build statuses

export async function getRunningStatuses(
  teamId: string,
  buildIds: string[]
): Promise<RunningBuildStatusDTO[]> {
  if (buildIds.length === 0) {
    return []
  }

  const { data, error } = await supabaseAdmin
    .from('env_builds')
    .select('id, status, reason, finished_at, envs!inner(team_id)')
    .eq('envs.team_id', teamId)
    .in('id', buildIds)

  if (error) throw error

  return (data ?? []).map((build) => ({
    id: build.id,
    status: mapDatabaseBuildStatusToBuildStatusDTO(
      build.status as BuildStatusDB
    ),
    finishedAt: build.finished_at
      ? new Date(build.finished_at).getTime()
      : null,
    statusMessage: mapDatabaseBuildReasonToListedBuildDTOStatusMessage(
      build.status,
      build.reason
    ),
  }))
}
