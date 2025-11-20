import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import type { Tables } from '@/types/database.types'
import {
  type BuildDTO,
  type BuildStatus,
  mapBuildStatus,
} from '../models/builds.models'

const TEMPLATE_BUILD_TIMEOUT_MS = 1000 * 60 * 60

type BuildRow = Tables<'env_builds'>

interface PaginationOptions {
  limit?: number
  cursor?: string
}

interface PaginatedResult<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
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

  if (envById) {
    return envById.id
  }

  const { data: envByAlias } = await supabaseAdmin
    .from('env_aliases')
    .select('env_id, envs!inner(team_id)')
    .eq('alias', templateIdOrAlias)
    .eq('envs.team_id', teamId)
    .maybeSingle()

  return envByAlias?.env_id ?? null
}

export async function getRunningBuilds(
  teamId: string,
  templateIdOrAlias?: string
): Promise<BuildRow[]> {
  const buildTimeoutAgo = new Date(
    Date.now() - TEMPLATE_BUILD_TIMEOUT_MS
  ).toISOString()

  let query = supabaseAdmin
    .from('env_builds')
    .select(
      `
      *,
      envs!inner(
        id,
        team_id
      )
    `
    )
    .in('status', ['waiting', 'building'])
    .gte('created_at', buildTimeoutAgo)
    .eq('envs.team_id', teamId)
    .order('created_at', { ascending: false })

  if (templateIdOrAlias) {
    const resolvedEnvId = await resolveTemplateId(templateIdOrAlias, teamId)
    if (!resolvedEnvId) {
      return []
    }
    query = query.eq('env_id', resolvedEnvId)
  }

  const { data: rawBuilds, error } = await query

  if (error) {
    throw error
  }

  if (!rawBuilds) {
    return []
  }

  const builds = rawBuilds.map((build) => {
    const { envs, ...buildData } = build as typeof build & { envs?: unknown }
    return buildData as BuildRow
  })

  return builds
}

export async function getCompletedBuilds(
  teamId: string,
  templateIdOrAlias?: string,
  options: PaginationOptions = {}
): Promise<PaginatedResult<BuildRow>> {
  const limit = options.limit ?? 50

  let query = supabaseAdmin
    .from('env_builds')
    .select(
      `
      *,
      envs!inner(
        id,
        team_id
      )
    `
    )
    .in('status', ['uploaded', 'failed'])
    .eq('envs.team_id', teamId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)

  if (templateIdOrAlias) {
    const resolvedEnvId = await resolveTemplateId(templateIdOrAlias, teamId)
    if (!resolvedEnvId) {
      return { data: [], nextCursor: null, hasMore: false }
    }
    query = query.eq('env_id', resolvedEnvId)
  }

  if (options.cursor) {
    query = query.lt('created_at', options.cursor)
  }

  const { data: rawBuilds, error } = await query

  if (error) {
    throw error
  }

  if (!rawBuilds) {
    return { data: [], nextCursor: null, hasMore: false }
  }

  const builds = rawBuilds.map((build) => {
    const { envs, ...buildData } = build as typeof build & { envs?: unknown }
    return buildData as BuildRow
  })

  const hasMore = builds.length > limit
  const data = hasMore ? builds.slice(0, limit) : builds
  const nextCursor =
    hasMore && data.length > 0 ? data[data.length - 1]!.created_at : null

  return {
    data,
    nextCursor,
    hasMore,
  }
}

export async function listBuilds(
  teamId: string,
  templateIdOrAlias?: string,
  options: PaginationOptions = {}
): Promise<PaginatedResult<BuildDTO>> {
  const limit = options.limit ?? 50
  const buildTimeoutAgo = new Date(
    Date.now() - TEMPLATE_BUILD_TIMEOUT_MS
  ).toISOString()

  let query = supabaseAdmin
    .from('env_builds')
    .select(
      `
      id,
      env_id,
      status,
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
    .or(
      `status.in.(uploaded,failed),and(status.in.(waiting,building),created_at.gte.${buildTimeoutAgo})`
    )
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)

  if (templateIdOrAlias) {
    const resolvedEnvId = await resolveTemplateId(templateIdOrAlias, teamId)
    if (!resolvedEnvId) {
      return { data: [], nextCursor: null, hasMore: false }
    }
    query = query.eq('env_id', resolvedEnvId)
  }

  if (options.cursor) {
    query = query.lt('created_at', options.cursor)
  }

  const { data: rawBuilds, error } = await query

  if (error) {
    throw error
  }

  if (!rawBuilds) {
    return { data: [], nextCursor: null, hasMore: false }
  }

  const builds: BuildDTO[] = rawBuilds.map((build) => {
    const envs = build.envs as {
      id: string
      team_id: string
      env_aliases: Array<{ alias: string }>
    }
    const alias = envs.env_aliases?.[0]?.alias

    return {
      id: build.id,
      shortId: build.id.split('-')[0]!,
      template: alias ?? build.env_id,
      status: mapBuildStatus(
        build.status as 'waiting' | 'building' | 'uploaded' | 'failed'
      ),
      createdAt: new Date(build.created_at).getTime(),
      finishedAt: build.finished_at
        ? new Date(build.finished_at).getTime()
        : null,
    }
  })

  const hasMore = builds.length > limit
  const data = hasMore ? builds.slice(0, limit) : builds
  const lastBuild = rawBuilds[data.length - 1]
  const nextCursor = hasMore && lastBuild ? lastBuild.created_at : null

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

  if (!data) {
    return []
  }

  return data.map((build) => ({
    id: build.id,
    status: mapBuildStatus(
      build.status as 'waiting' | 'building' | 'uploaded' | 'failed'
    ),
  }))
}
