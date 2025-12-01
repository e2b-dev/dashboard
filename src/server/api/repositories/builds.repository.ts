import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { TRPCError } from '@trpc/server'
import z from 'zod'
import { apiError } from '../errors'
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

const BUILD_TIMEOUT_MS = 70 * 60 * 1000 // 70 minutes

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
  const buildTimeoutThreshold = new Date(
    Date.now() - BUILD_TIMEOUT_MS
  ).toISOString()

  const runningStatuses = statuses.filter(
    (s) => s === 'waiting' || s === 'building'
  )
  const completedStatuses = statuses.filter(
    (s) => s === 'uploaded' || s === 'failed'
  )

  let statusFilter: string
  if (runningStatuses.length > 0 && completedStatuses.length > 0) {
    statusFilter = `status.in.(${completedStatuses.join(',')}),and(status.in.(${runningStatuses.join(',')}),created_at.gte.${buildTimeoutThreshold})`
  } else if (runningStatuses.length > 0) {
    statusFilter = `and(status.in.(${runningStatuses.join(',')}),created_at.gte.${buildTimeoutThreshold})`
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

// get build details

export async function getBuildInfo(buildId: string, teamId: string) {
  const { data, error } = await supabaseAdmin
    .from('env_builds')
    .select('created_at, finished_at, envs!inner(env_aliases(alias))')
    .eq('id', buildId)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: "Build not found or you don't have access to it",
    })
  }

  const alias = data.envs.env_aliases?.[0]?.alias

  return {
    alias,
    createdAt: new Date(data.created_at).getTime(),
    finishedAt: data.finished_at ? new Date(data.finished_at).getTime() : null,
  }
}

// get build status

export async function getInfraBuildStatus(
  accessToken: string,
  teamId: string,
  templateId: string,
  buildId: string
) {
  const result = await infra.GET(
    `/templates/{templateID}/builds/{buildID}/status`,
    {
      params: {
        path: {
          templateID: templateId,
          buildID: buildId,
        },
      },
      headers: {
        ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
      },
    }
  )

  if (!result.response.ok || result.error) {
    const status = result.response.status

    l.error(
      {
        key: 'repositories:builds:get_build_status:infra_error',
        error: result.error,
        team_id: teamId,
        context: {
          status,
          path: '/templates/{templateID}/builds/{buildID}/status',
        },
      },
      `failed to fetch /templates/{templateID}/builds/{buildID}/status: ${result.error?.message || 'Unknown error'}`
    )

    if (status === 404) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: "Build not found or you don't have access to it",
      })
    }

    throw apiError(status)
  }

  return result.data
}
