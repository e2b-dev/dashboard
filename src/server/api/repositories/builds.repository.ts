import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import z from 'zod'
import {
  type BuildDTO,
  type BuildStatus,
  type BuildStatusDB,
  mapBuildStatusDB,
} from '../models/builds.models'

const TEMPLATE_BUILD_TIMEOUT_MS =
  1000 * 60 * 60 + 1000 * 60 * 10 /* 1 hour + 10 minutes margin */

interface PaginationOptions {
  limit?: number
  cursor?: string
}

interface PaginatedResult<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

type RawBuild = {
  id: string
  env_id: string
  status: string
  reason: unknown
  created_at: string
  finished_at: string | null
  envs: {
    id: string
    team_id: string
    env_aliases: Array<{ alias: string }> | null
  }
}

function isUUID(value: string): boolean {
  return z.uuid().safeParse(value).success
}

function extractStatusMessage(status: string, reason: unknown): string | null {
  if (status !== 'failed') return null
  if (!reason || typeof reason !== 'object') return null
  if (!('message' in reason)) return null
  if (typeof reason.message !== 'string') return null
  return reason.message
}

function mapRawBuildToDTO(build: RawBuild): BuildDTO {
  const alias = build.envs.env_aliases?.[0]?.alias

  return {
    id: build.id,
    shortId: build.id.split('-')[0]!,
    template: alias ?? build.env_id,
    status: mapBuildStatusDB(build.status as BuildStatusDB),
    statusMessage:
      'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua',
    createdAt: new Date(build.created_at).getTime(),
    finishedAt: build.finished_at
      ? new Date(build.finished_at).getTime()
      : null,
  }
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

export async function listBuilds(
  teamId: string,
  buildIdOrTemplate?: string,
  statuses: BuildStatusDB[] = ['waiting', 'building', 'uploaded', 'failed'],
  options: PaginationOptions = {}
): Promise<PaginatedResult<BuildDTO>> {
  const limit = options.limit ?? 50

  l.info({
    key: 'builds:list:params',
    context: { buildIdOrTemplate, statuses, limit, cursor: options.cursor },
  })

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

  const builds = (rawBuilds as RawBuild[]).map(mapRawBuildToDTO)
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

export async function getBuildStatuses(
  teamId: string,
  buildIds: string[]
): Promise<Array<{ id: string; status: BuildStatus }>> {
  if (buildIds.length === 0) {
    return []
  }

  const { data, error } = await supabaseAdmin
    .from('env_builds')
    .select(
      `
      id,
      status,
      envs!inner(team_id)
    `
    )
    .eq('envs.team_id', teamId)
    .in('id', buildIds)

  if (error) {
    throw error
  }

  if (!data || data.length === 0) {
    return []
  }

  return data.map((build) => ({
    id: build.id,
    status: mapBuildStatusDB(build.status as BuildStatusDB),
  }))
}
