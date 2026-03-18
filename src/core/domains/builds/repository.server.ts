import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import type {
  BuildStatus,
  ListedBuildModel,
  RunningBuildStatusModel,
} from '@/core/domains/builds/models'
import { l } from '@/core/shared/clients/logger/logger'
import { repoErrorFromHttp } from '@/core/shared/errors'
import type { TeamRequestScope } from '@/core/shared/repository-scope'
import { err, ok, type RepoResult } from '@/core/shared/result'
import { INITIAL_BUILD_STATUSES } from '@/features/dashboard/templates/builds/constants'
import { api, infra } from '@/lib/clients/api'
import type { components as InfraComponents } from '@/types/infra-api.types'

type BuildsRepositoryDeps = {
  apiClient: typeof api
  infraClient: typeof infra
  authHeaders: typeof SUPABASE_AUTH_HEADERS
}

export type BuildsScope = TeamRequestScope

export interface BuildsRepository {
  listBuilds(
    buildIdOrTemplate?: string,
    statuses?: BuildStatus[],
    options?: ListBuildsOptions
  ): Promise<RepoResult<ListBuildsResult>>
  getRunningStatuses(
    buildIds: string[]
  ): Promise<RepoResult<RunningBuildStatusModel[]>>
  getBuildInfo(buildId: string): Promise<RepoResult<BuildInfoResult>>
  getInfraBuildStatus(
    templateId: string,
    buildId: string
  ): Promise<RepoResult<InfraComponents['schemas']['TemplateBuildInfo']>>
  getInfraBuildLogs(
    templateId: string,
    buildId: string,
    options?: GetInfraBuildLogsOptions
  ): Promise<
    RepoResult<InfraComponents['schemas']['TemplateBuildLogsResponse']>
  >
}

const LIST_BUILDS_DEFAULT_LIMIT = 50
const LIST_BUILDS_MIN_LIMIT = 1
const LIST_BUILDS_MAX_LIMIT = 100

function normalizeListBuildsLimit(limit?: number): number {
  return Math.max(
    LIST_BUILDS_MIN_LIMIT,
    Math.min(limit ?? LIST_BUILDS_DEFAULT_LIMIT, LIST_BUILDS_MAX_LIMIT)
  )
}

interface ListBuildsOptions {
  limit?: number
  cursor?: string
}

interface ListBuildsResult {
  data: ListedBuildModel[]
  nextCursor: string | null
}

interface BuildInfoResult {
  names: string[] | null
  createdAt: number
  finishedAt: number | null
  status: ListedBuildModel['status']
  statusMessage: string | null
}

export interface GetInfraBuildLogsOptions {
  cursor?: number
  limit?: number
  direction?: 'forward' | 'backward'
  level?: 'debug' | 'info' | 'warn' | 'error'
}

export function createBuildsRepository(
  scope: BuildsScope,
  deps: BuildsRepositoryDeps = {
    apiClient: api,
    infraClient: infra,
    authHeaders: SUPABASE_AUTH_HEADERS,
  }
): BuildsRepository {
  return {
    async listBuilds(
      buildIdOrTemplate,
      statuses = INITIAL_BUILD_STATUSES,
      options = {}
    ): Promise<RepoResult<ListBuildsResult>> {
      const limit = normalizeListBuildsLimit(options.limit)
      const result = await deps.apiClient.GET('/builds', {
        params: {
          query: {
            build_id_or_template: buildIdOrTemplate?.trim() || undefined,
            statuses,
            limit,
            cursor: options.cursor,
          },
        },
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
      })

      if (!result.response.ok || result.error) {
        l.error({
          key: 'repositories:builds:list_builds:dashboard_api_error',
          error: result.error,
          team_id: scope.teamId,
          context: {
            status: result.response.status,
            path: '/builds',
          },
        })
        return err(
          repoErrorFromHttp(
            result.response.status,
            result.error?.message ?? 'Failed to fetch builds',
            result.error
          )
        )
      }

      const builds = result.data?.data ?? []
      if (builds.length === 0) {
        return ok({
          data: [],
          nextCursor: null,
        })
      }

      return ok({
        data: builds.map(
          (build): ListedBuildModel => ({
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
      })
    },
    async getRunningStatuses(buildIds) {
      if (buildIds.length === 0) {
        return ok([])
      }

      const result = await deps.apiClient.GET('/builds/statuses', {
        params: {
          query: {
            build_ids: buildIds,
          },
        },
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
      })

      if (!result.response.ok || result.error) {
        l.error({
          key: 'repositories:builds:get_running_statuses:dashboard_api_error',
          error: result.error,
          team_id: scope.teamId,
          context: {
            status: result.response.status,
            path: '/builds/statuses',
          },
        })
        return err(
          repoErrorFromHttp(
            result.response.status,
            result.error?.message ?? 'Failed to fetch build statuses',
            result.error
          )
        )
      }

      return ok(
        (result.data?.buildStatuses ?? []).map((row) => ({
          id: row.id,
          status: row.status,
          finishedAt: row.finishedAt
            ? new Date(row.finishedAt).getTime()
            : null,
          statusMessage: row.statusMessage,
        }))
      )
    },
    async getBuildInfo(buildId) {
      const result = await deps.apiClient.GET('/builds/{build_id}', {
        params: {
          path: {
            build_id: buildId,
          },
        },
        headers: {
          ...deps.authHeaders(scope.accessToken, scope.teamId),
        },
      })

      if (!result.response.ok || result.error) {
        l.error({
          key: 'repositories:builds:get_build_info:dashboard_api_error',
          error: result.error,
          team_id: scope.teamId,
          context: {
            status: result.response.status,
            path: '/builds/{build_id}',
            build_id: buildId,
          },
        })
        return err(
          repoErrorFromHttp(
            result.response.status,
            result.error?.message ?? 'Failed to fetch build info',
            result.error
          )
        )
      }

      const data = result.data

      return ok({
        names: data.names ?? null,
        createdAt: new Date(data.createdAt).getTime(),
        finishedAt: data.finishedAt
          ? new Date(data.finishedAt).getTime()
          : null,
        status: data.status,
        statusMessage: data.statusMessage,
      })
    },
    async getInfraBuildStatus(templateId, buildId) {
      const result = await deps.infraClient.GET(
        '/templates/{templateID}/builds/{buildID}/status',
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
            ...deps.authHeaders(scope.accessToken, scope.teamId),
          },
        }
      )

      if (!result.response.ok || result.error) {
        l.error({
          key: 'repositories:builds:get_build_status:infra_error',
          error: result.error,
          team_id: scope.teamId,
          context: {
            status: result.response.status,
            path: '/templates/{templateID}/builds/{buildID}/status',
          },
        })
        return err(
          repoErrorFromHttp(
            result.response.status,
            result.error?.message ?? 'Failed to fetch build status',
            result.error
          )
        )
      }

      return ok(result.data)
    },
    async getInfraBuildLogs(templateId, buildId, options = {}) {
      const result = await deps.infraClient.GET(
        '/templates/{templateID}/builds/{buildID}/logs',
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
            ...deps.authHeaders(scope.accessToken, scope.teamId),
          },
        }
      )

      if (!result.response.ok || result.error) {
        l.error({
          key: 'repositories:builds:get_build_logs:infra_error',
          error: result.error,
          team_id: scope.teamId,
          context: {
            status: result.response.status,
            path: '/templates/{templateID}/builds/{buildID}/logs',
          },
        })
        return err(
          repoErrorFromHttp(
            result.response.status,
            result.error?.message ?? 'Failed to fetch build logs',
            result.error
          )
        )
      }

      return ok(result.data)
    },
  }
}
