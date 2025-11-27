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

interface ListBuildsOptions {
  limit?: number
  cursor?: string
}

interface ListBuildsResult {
  data: ListedBuildDTO[]
  nextCursor: string | null
}

export async function listBuilds(
  teamId: string,
  buildIdOrTemplate?: string,
  statuses: BuildStatusDB[] = ['waiting', 'building', 'uploaded', 'failed'],
  options: ListBuildsOptions = {}
): Promise<ListBuildsResult> {
  const limit = options.limit ?? 50

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
    .in('status', statuses)
    .order('created_at', { ascending: false })

  if (buildIdOrTemplate) {
    const resolvedEnvId = await resolveTemplateId(buildIdOrTemplate, teamId)
    const isBuildUUID = isUUID(buildIdOrTemplate)

    if (!resolvedEnvId && !isBuildUUID) {
      return {
        data: [],
        nextCursor: null,
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
    query = query.lt('created_at', options.cursor)
  }

  query = query.limit(limit + 1)

  const { data: rawBuilds, error } = await query

  if (error) {
    throw error
  }

  if (!rawBuilds || rawBuilds.length === 0) {
    return {
      data: [],
      nextCursor: null,
    }
  }

  const hasMore = rawBuilds.length > limit
  const trimmedBuilds = hasMore ? rawBuilds.slice(0, limit) : rawBuilds

  return {
    data: trimmedBuilds.map(mapDatabaseBuildToListedBuildDTO),
    nextCursor: hasMore
      ? trimmedBuilds[trimmedBuilds.length - 1]!.created_at
      : null,
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
