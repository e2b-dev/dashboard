import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import type { Tables } from '@/types/database.types'

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
    .in('status', ['ready', 'failed'])
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
