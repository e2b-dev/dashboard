import 'server-only'

import { authHeaders } from '@/configs/api'
import type { components as DashboardComponents } from '@/contracts/dashboard-api'
import { api } from '@/core/shared/clients/api'
import { createRepoError, repoErrorFromHttp } from '@/core/shared/errors'
import type { RequestScope } from '@/core/shared/repository-scope'
import { err, ok, type RepoResult } from '@/core/shared/result'
import type { TeamMember } from './models'

type TeamsRepositoryDeps = {
  apiClient: typeof api
  authHeaders: typeof authHeaders
}

export type TeamsRequestScope = RequestScope & {
  teamId?: string
}

export interface TeamsRepository {
  listTeamMembers(): Promise<RepoResult<TeamMember[]>>
  updateTeamName(
    name: string
  ): Promise<RepoResult<DashboardComponents['schemas']['UpdateTeamResponse']>>
  addTeamMember(email: string): Promise<RepoResult<void>>
  removeTeamMember(userId: string): Promise<RepoResult<void>>

}

function requireTeamId(scope: TeamsRequestScope): RepoResult<string> {
  if (!scope.teamId) {
    return err(
      createRepoError({
        code: 'internal',
        status: 500,
        message: 'teamId is required for team-scoped repository operation',
      })
    )
  }

  return ok(scope.teamId)
}

export function createTeamsRepository(
  scope: TeamsRequestScope,
  deps: TeamsRepositoryDeps = {
    apiClient: api,
    authHeaders: authHeaders,
  }
): TeamsRepository {
  return {
    async listTeamMembers(): Promise<RepoResult<TeamMember[]>> {
      const teamId = requireTeamId(scope)
      if (!teamId.ok) {
        return teamId
      }

      const { data, error, response } = await deps.apiClient.GET(
        '/teams/{teamID}/members',
        {
          params: { path: { teamID: teamId.data } },
          headers: deps.authHeaders(scope.accessToken, teamId.data),
        }
      )

      if (!response.ok || error) {
        return err(
          repoErrorFromHttp(
            response.status,
            error?.message ?? 'Failed to fetch team members',
            error
          )
        )
      }

      const mapped: TeamMember[] = (data?.members ?? []).map((member) => ({
        info: {
          id: member.id,
          email: member.email,
          name: member.name ?? undefined,
          avatar_url: member.profilePictureUrl ?? undefined,
          providers: member.providers ?? [],
          createdAt: member.createdAt,
        },
        relation: {
          added_by: member.addedBy ?? null,
          is_default: member.isDefault,
        },
      }))

      return ok(mapped)
    },
    async updateTeamName(
      name
    ): Promise<
      RepoResult<DashboardComponents['schemas']['UpdateTeamResponse']>
    > {
      const teamId = requireTeamId(scope)
      if (!teamId.ok) {
        return teamId
      }

      const { data, error, response } = await deps.apiClient.PATCH(
        '/teams/{teamID}',
        {
          params: { path: { teamID: teamId.data } },
          headers: deps.authHeaders(scope.accessToken, teamId.data),
          body: { name },
        }
      )

      if (!response.ok || error || !data) {
        return err(
          repoErrorFromHttp(
            response.status,
            error?.message ?? 'Failed to update team name',
            error
          )
        )
      }

      return ok(data)
    },
    async addTeamMember(email): Promise<RepoResult<void>> {
      const teamId = requireTeamId(scope)
      if (!teamId.ok) {
        return teamId
      }

      const { error, response } = await deps.apiClient.POST(
        '/teams/{teamID}/members',
        {
          params: { path: { teamID: teamId.data } },
          headers: deps.authHeaders(scope.accessToken, teamId.data),
          body: { email },
        }
      )

      if (!response.ok || error) {
        return err(
          repoErrorFromHttp(
            response.status,
            error?.message ?? 'Failed to add team member',
            error
          )
        )
      }

      return ok(undefined)
    },
    async removeTeamMember(userId): Promise<RepoResult<void>> {
      const teamId = requireTeamId(scope)
      if (!teamId.ok) {
        return teamId
      }

      const { error, response } = await deps.apiClient.DELETE(
        '/teams/{teamID}/members/{userId}',
        {
          params: { path: { teamID: teamId.data, userId } },
          headers: deps.authHeaders(scope.accessToken, teamId.data),
        }
      )

      if (!response.ok || error) {
        return err(
          repoErrorFromHttp(
            response.status,
            error?.message ?? 'Failed to remove team member',
            error
          )
        )
      }

      return ok(undefined)
    },

  }
}
