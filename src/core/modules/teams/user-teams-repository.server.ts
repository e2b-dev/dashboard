import 'server-only'

import { secondsInMinute } from 'date-fns/constants'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import type { components as DashboardComponents } from '@/contracts/dashboard-api'
import { api } from '@/core/shared/clients/api'
import { createRepoError, repoErrorFromHttp } from '@/core/shared/errors'
import type { RequestScope } from '@/core/shared/repository-scope'
import { err, ok, type RepoResult } from '@/core/shared/result'
import type { ResolvedTeam, TeamModel } from './models'

type UserTeamsRepositoryDeps = {
  apiClient: typeof api
  authHeaders: typeof SUPABASE_AUTH_HEADERS
}

export type UserTeamsRequestScope = RequestScope

export interface UserTeamsRepository {
  listUserTeams(): Promise<RepoResult<TeamModel[]>>
  createTeam(
    name: string
  ): Promise<RepoResult<DashboardComponents['schemas']['TeamResolveResponse']>>
  resolveTeamBySlug(
    slug: string,
    next?: { tags?: string[] }
  ): Promise<RepoResult<ResolvedTeam>>
}

export function createUserTeamsRepository(
  scope: UserTeamsRequestScope,
  deps: UserTeamsRepositoryDeps = {
    apiClient: api,
    authHeaders: SUPABASE_AUTH_HEADERS,
  }
): UserTeamsRepository {
  const listApiUserTeams = async (): Promise<RepoResult<TeamModel[]>> => {
    const { data, error, response } = await deps.apiClient.GET('/teams', {
      headers: deps.authHeaders(scope.accessToken),
    })

    if (!response.ok || error || !data?.teams) {
      return err(
        repoErrorFromHttp(
          response.status,
          error?.message ?? 'Failed to fetch user teams',
          error
        )
      )
    }

    return ok(data.teams)
  }

  return {
    async listUserTeams(): Promise<RepoResult<TeamModel[]>> {
      const teamsResult = await listApiUserTeams()

      return teamsResult
    },
    async createTeam(
      name
    ): Promise<
      RepoResult<DashboardComponents['schemas']['TeamResolveResponse']>
    > {
      const { data, error, response } = await deps.apiClient.POST('/teams', {
        headers: deps.authHeaders(scope.accessToken),
        body: { name },
      })

      if (!response.ok || error || !data) {
        if (response.status === 400) {
          return err(
            createRepoError({
              code: 'validation',
              status: response.status,
              message: error?.message ?? 'Failed to create team',
              cause: error,
            })
          )
        }

        return err(
          repoErrorFromHttp(
            response.status,
            error?.message ?? 'Failed to create team',
            error
          )
        )
      }

      return ok(data)
    },
    async resolveTeamBySlug(
      slug: string,
      next?: { tags?: string[] }
    ): Promise<RepoResult<ResolvedTeam>> {
      const { data, error, response } = await deps.apiClient.GET(
        '/teams/resolve',
        {
          params: { query: { slug } },
          headers: deps.authHeaders(scope.accessToken),
          next: {
            revalidate: secondsInMinute * 5,
            ...next,
          },
        }
      )

      if (!response.ok || error || !data) {
        return err(
          repoErrorFromHttp(
            response.status,
            error?.message ?? 'Failed to resolve team',
            error
          )
        )
      }

      return ok({
        id: data.id,
        slug: data.slug,
      })
    },
  }
}
