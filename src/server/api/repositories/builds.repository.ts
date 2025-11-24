import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import z from 'zod'
import {
  ListedBuildDTO,
  mapDatabaseBuildReasonToListedBuildDTOStatusMessage,
  mapDatabaseBuildStatusToBuildStatusDTO,
  mapDatabaseBuildToListedBuildDTO,
  type RunningBuildStatusDTO,
  type BuildStatusDB,
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
}

interface ListBuildsPaginatedResult<T> {
  data: T[]
  nextCursor: string | null
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
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)

  if (buildIdOrTemplate) {
    const resolvedEnvId = await resolveTemplateId(buildIdOrTemplate, teamId)
    const isBuildUUID = isUUID(buildIdOrTemplate)

    if (!resolvedEnvId && !isBuildUUID) {
      return { data: [], nextCursor: null, hasMore: false }
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
    query = query.lt('created_at', options.cursor)
  }

  const { data: rawBuilds, error } = await query

  if (error) {
    throw error
  }

  if (!rawBuilds || rawBuilds.length === 0) {
    return { data: [], nextCursor: null, hasMore: false }
  }

  const builds = rawBuilds.map(mapDatabaseBuildToListedBuildDTO)
  const hasMore = builds.length > limit
  const data = hasMore ? builds.slice(0, limit) : builds
  const lastRawBuild = rawBuilds[data.length - 1]
  const nextCursor = hasMore && lastRawBuild ? lastRawBuild.created_at : null

  return {
    data,
    nextCursor,
    hasMore,
  }
}

// get latest build timestamp

export async function getLatestBuildTimestamp(
  teamId: string
): Promise<number | null> {
  const { data, error } = await supabaseAdmin
    .from('env_builds')
    .select('created_at, envs!inner(team_id)')
    .eq('envs.team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  return data ? new Date(data.created_at).getTime() : null
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
