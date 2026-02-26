import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { api, infra } from '@/lib/clients/api'
import { handleDashboardApiError, handleInfraApiError } from '../errors'
import {
  ListedBuildDTO,
  type BuildStatusDB,
  type RunningBuildStatusDTO,
} from '../models/builds.models'

// helpers

const LIST_BUILDS_DEFAULT_LIMIT = 50
const LIST_BUILDS_MIN_LIMIT = 1
const LIST_BUILDS_MAX_LIMIT = 100

function normalizeListBuildsLimit(limit?: number): number {
  return Math.max(
    LIST_BUILDS_MIN_LIMIT,
    Math.min(limit ?? LIST_BUILDS_DEFAULT_LIMIT, LIST_BUILDS_MAX_LIMIT)
  )
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

interface BuildInfoResult {
  names: string[] | null
  createdAt: number
  finishedAt: number | null
  status: ListedBuildDTO['status']
  statusMessage: string | null
}

async function listBuilds(
  accessToken: string,
  teamId: string,
  buildIdOrTemplate?: string,
  statuses: BuildStatusDB[] = ['waiting', 'building', 'uploaded', 'failed'],
  options: ListBuildsOptions = {}
): Promise<ListBuildsResult> {
  const limit = normalizeListBuildsLimit(options.limit)
  const result = await api.GET('/builds', {
    params: {
      query: {
        build_id_or_template: buildIdOrTemplate?.trim() || undefined,
        statuses,
        limit,
        cursor: options.cursor,
      },
    },
    headers: {
      ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
    },
  })

  if (!result.response.ok || result.error) {
    handleDashboardApiError({
      status: result.response.status,
      error: result.error,
      teamId,
      path: '/builds',
      logKey: 'repositories:builds:list_builds:dashboard_api_error',
    })
  }

  const builds = result.data?.data ?? []
  if (builds.length === 0) {
    return {
      data: [],
      nextCursor: null,
    }
  }

  return {
    data: builds.map(
      (build): ListedBuildDTO => ({
        id: build.id,
        template: build.template,
        templateId: build.templateId,
        status: build.status,
        statusMessage: build.statusMessage,
        createdAt: new Date(build.createdAt).getTime(),
        finishedAt: build.finishedAt
          ? new Date(build.finishedAt).getTime()
          : null,
      })
    ),
    nextCursor: result.data?.nextCursor ?? null,
  }
}

// get running build statuses

async function getRunningStatuses(
  accessToken: string,
  teamId: string,
  buildIds: string[]
): Promise<RunningBuildStatusDTO[]> {
  if (buildIds.length === 0) {
    return []
  }

  const result = await api.GET('/builds/statuses', {
    params: {
      query: {
        build_ids: buildIds,
      },
    },
    headers: {
      ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
    },
  })

  if (!result.response.ok || result.error) {
    handleDashboardApiError({
      status: result.response.status,
      error: result.error,
      teamId,
      path: '/builds/statuses',
      logKey: 'repositories:builds:get_running_statuses:dashboard_api_error',
    })
  }

  return (result.data?.buildStatuses ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    finishedAt: row.finishedAt ? new Date(row.finishedAt).getTime() : null,
    statusMessage: row.statusMessage,
  }))
}

// get build details

export async function getBuildInfo(
  accessToken: string,
  buildId: string,
  teamId: string
): Promise<BuildInfoResult> {
  const result = await api.GET('/builds/{build_id}', {
    params: {
      path: {
        build_id: buildId,
      },
    },
    headers: {
      ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
    },
  })

  if (!result.response.ok || result.error) {
    handleDashboardApiError({
      status: result.response.status,
      error: result.error,
      teamId,
      path: '/builds/{build_id}',
      logKey: 'repositories:builds:get_build_info:dashboard_api_error',
      context: {
        build_id: buildId,
      },
    })
  }

  const data = result.data

  return {
    names: data.names ?? null,
    createdAt: new Date(data.createdAt).getTime(),
    finishedAt: data.finishedAt ? new Date(data.finishedAt).getTime() : null,
    status: data.status,
    statusMessage: data.statusMessage,
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
    handleInfraApiError({
      status: result.response.status,
      error: result.error,
      teamId,
      path: '/templates/{templateID}/builds/{buildID}/status',
      logKey: 'repositories:builds:get_build_status:infra_error',
    })
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
    handleInfraApiError({
      status: result.response.status,
      error: result.error,
      teamId,
      path: '/templates/{templateID}/builds/{buildID}/logs',
      logKey: 'repositories:builds:get_build_logs:infra_error',
    })
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
