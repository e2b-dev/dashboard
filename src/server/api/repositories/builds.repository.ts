import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import type { Database } from '@/types/database.types'
import { TRPCError } from '@trpc/server'
import z from 'zod'
import { apiError } from '../errors'
import {
  ListedBuildDTO,
  mapDatabaseBuildReasonToListedBuildDTOStatusMessage,
  mapDatabaseBuildStatusToBuildStatusDTO,
  type BuildStatusDB,
  type RunningBuildStatusDTO,
} from '../models/builds.models'

// helpers

function isUUID(value: string): boolean {
  return z.uuid().safeParse(value).success
}

const CURSOR_SEPARATOR = '|'

function decodeCursor(cursor?: string): {
  cursorCreatedAt: string | null
  cursorId: string | null
} {
  if (!cursor) {
    return { cursorCreatedAt: null, cursorId: null }
  }

  // Backward-compatible with old cursor format (created_at only)
  if (!cursor.includes(CURSOR_SEPARATOR)) {
    return { cursorCreatedAt: cursor, cursorId: null }
  }

  const [cursorCreatedAtRaw, cursorIdRaw] = cursor.split(CURSOR_SEPARATOR, 2)

  return {
    cursorCreatedAt: cursorCreatedAtRaw || null,
    cursorId: cursorIdRaw && isUUID(cursorIdRaw) ? cursorIdRaw : null,
  }
}

function encodeCursor(createdAt: string, id: string): string {
  return `${createdAt}${CURSOR_SEPARATOR}${id}`
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

type ListTeamBuildsRpcRow =
  Database['public']['Functions']['list_team_builds_rpc']['Returns'][number]
type ListTeamRunningBuildStatusesRpcRow =
  Database['public']['Functions']['list_team_running_build_statuses_rpc']['Returns'][number]

function mapRpcBuildToListedBuildDTO(
  build: ListTeamBuildsRpcRow
): ListedBuildDTO {
  return {
    id: build.id,
    template: build.template_alias ?? build.template_id,
    templateId: build.template_id,
    status: mapDatabaseBuildStatusToBuildStatusDTO(
      build.status as BuildStatusDB
    ),
    statusMessage: mapDatabaseBuildReasonToListedBuildDTOStatusMessage(
      build.status,
      build.reason
    ),
    createdAt: new Date(build.created_at).getTime(),
    finishedAt: build.finished_at
      ? new Date(build.finished_at).getTime()
      : null,
  }
}

async function listBuilds(
  teamId: string,
  buildIdOrTemplate?: string,
  statuses: BuildStatusDB[] = ['waiting', 'building', 'uploaded', 'failed'],
  options: ListBuildsOptions = {}
): Promise<ListBuildsResult> {
  const limit = options.limit ?? 50
  const { cursorCreatedAt, cursorId } = decodeCursor(options.cursor)

  const { data: rawBuilds, error } = await supabaseAdmin.rpc(
    'list_team_builds_rpc',
    {
      p_team_id: teamId,
      p_statuses: statuses,
      p_limit: limit,
      p_cursor_created_at: cursorCreatedAt ?? undefined,
      p_cursor_id: cursorId ?? undefined,
      p_build_id_or_template: buildIdOrTemplate?.trim() || undefined,
    }
  )

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
    data: trimmedBuilds.map(mapRpcBuildToListedBuildDTO),
    nextCursor: hasMore
      ? encodeCursor(
          trimmedBuilds[trimmedBuilds.length - 1]!.created_at,
          trimmedBuilds[trimmedBuilds.length - 1]!.id
        )
      : null,
  }
}

// get running build statuses

async function getRunningStatuses(
  teamId: string,
  buildIds: string[]
): Promise<RunningBuildStatusDTO[]> {
  if (buildIds.length === 0) {
    return []
  }

  const { data, error } = await supabaseAdmin.rpc(
    'list_team_running_build_statuses_rpc',
    {
      p_team_id: teamId,
      p_build_ids: buildIds,
    }
  )

  if (error) throw error

  return ((data ?? []) as ListTeamRunningBuildStatusesRpcRow[]).map((row) => ({
    id: row.id,
    status: mapDatabaseBuildStatusToBuildStatusDTO(row.status as BuildStatusDB),
    finishedAt: row.finished_at ? new Date(row.finished_at).getTime() : null,
    statusMessage: mapDatabaseBuildReasonToListedBuildDTOStatusMessage(
      row.status,
      row.reason
    ),
  }))
}

// get build details

export async function getBuildInfo(buildId: string, teamId: string) {
  const { data: assignment, error: assignmentError } = await supabaseAdmin
    .from('env_build_assignments')
    .select('env_id, envs!inner(team_id)')
    .eq('build_id', buildId)
    .eq('envs.team_id', teamId)
    .limit(1)
    .maybeSingle()

  if (assignmentError) {
    l.error(
      {
        key: 'repositories:builds:get_build_info:supabase_error',
        error: assignmentError,
        team_id: teamId,
        context: {
          build_id: buildId,
        },
      },
      `failed to query env_build_assignments: ${assignmentError?.message || 'Unknown error'}`
    )

    throw new TRPCError({
      code: 'NOT_FOUND',
      message: "Build not found or you don't have access to it",
    })
  }

  if (!assignment) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: "Build not found or you don't have access to it",
    })
  }

  const { data, error } = await supabaseAdmin
    .from('env_builds')
    .select('created_at, finished_at, status, reason')
    .eq('id', buildId)
    .maybeSingle()

  if (error || !data) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: "Build not found or you don't have access to it",
    })
  }

  const { data: aliases } = await supabaseAdmin
    .from('env_aliases')
    .select('alias')
    .eq('env_id', assignment.env_id)
    .limit(1)

  const alias = aliases?.[0]?.alias

  return {
    alias,
    createdAt: new Date(data.created_at).getTime(),
    finishedAt: data.finished_at ? new Date(data.finished_at).getTime() : null,
    status: mapDatabaseBuildStatusToBuildStatusDTO(
      data.status as BuildStatusDB
    ),
    statusMessage: mapDatabaseBuildReasonToListedBuildDTOStatusMessage(
      data.status,
      data.reason
    ),
  }
}

// get build status (without logs)

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
        query: {
          limit: 0,
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

// get build logs

export interface GetInfraBuildLogsOptions {
  cursor?: number
  limit?: number
  direction?: 'forward' | 'backward'
  level?: 'debug' | 'info' | 'warn' | 'error'
}

export async function getInfraBuildLogs(
  accessToken: string,
  teamId: string,
  templateId: string,
  buildId: string,
  options: GetInfraBuildLogsOptions = {}
) {
  const result = await infra.GET(
    `/templates/{templateID}/builds/{buildID}/logs`,
    {
      params: {
        path: {
          templateID: templateId,
          buildID: buildId,
        },
        query: {
          cursor: options.cursor,
          limit: options.limit,
          direction: options.direction,
          level: options.level,
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
        key: 'repositories:builds:get_build_logs:infra_error',
        error: result.error,
        team_id: teamId,
        context: {
          status,
          path: '/templates/{templateID}/builds/{buildID}/logs',
        },
      },
      `failed to fetch /templates/{templateID}/builds/{buildID}/logs: ${result.error?.message || 'Unknown error'}`
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

export const buildsRepo = {
  listBuilds,
  getRunningStatuses,
  getBuildInfo,
  getInfraBuildStatus,
  getInfraBuildLogs,
}
