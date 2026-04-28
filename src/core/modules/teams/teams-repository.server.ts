import 'server-only'

import type { User } from '@supabase/supabase-js'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import type { components as DashboardComponents } from '@/contracts/dashboard-api'
import { api } from '@/core/shared/clients/api'
import { supabaseAdmin } from '@/core/shared/clients/supabase/admin'
import { createRepoError, repoErrorFromHttp } from '@/core/shared/errors'
import type { RequestScope } from '@/core/shared/repository-scope'
import { err, ok, type RepoResult } from '@/core/shared/result'
import type { TeamMember } from './models'

type TeamsRepositoryDeps = {
  apiClient: typeof api
  authHeaders: typeof SUPABASE_AUTH_HEADERS
  adminClient: typeof supabaseAdmin
}

export type TeamsRequestScope = RequestScope & {
  teamId?: string
}

export interface TeamsRepository {
  createTeam(
    name: string
  ): Promise<RepoResult<DashboardComponents['schemas']['TeamResolveResponse']>>
  listTeamMembers(): Promise<RepoResult<TeamMember[]>>
  updateTeamName(
    name: string
  ): Promise<RepoResult<DashboardComponents['schemas']['UpdateTeamResponse']>>
  addTeamMember(email: string): Promise<RepoResult<void>>
  removeTeamMember(userId: string): Promise<RepoResult<void>>
  updateTeamProfilePictureUrl(
    profilePictureUrl: string
  ): Promise<RepoResult<DashboardComponents['schemas']['UpdateTeamResponse']>>
}

function extractSignInProviders(user: User | null | undefined): string[] {
  const appProviders = Array.isArray(user?.app_metadata?.providers)
    ? user.app_metadata.providers.filter(
        (provider): provider is string => typeof provider === 'string'
      )
    : []
  const identityProviders =
    user?.identities
      ?.map((identity) => identity.provider)
      .filter((provider): provider is string => typeof provider === 'string') ??
    []

  return [...new Set([...appProviders, ...identityProviders])]
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
    authHeaders: SUPABASE_AUTH_HEADERS,
    adminClient: supabaseAdmin,
  }
): TeamsRepository {
  return {
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

      const members = data?.members ?? []
      const enrichedMembers = await Promise.all(
        members.map(async (member) => {
          const { data: userData } =
            await deps.adminClient.auth.admin.getUserById(member.id)
          const user = userData.user

          return {
            info: {
              id: member.id,
              email: member.email,
              name: user?.user_metadata?.name,
              avatar_url: user?.user_metadata?.avatar_url,
              providers: extractSignInProviders(user),
              createdAt: member.createdAt,
            },
            relation: {
              added_by: member.addedBy ?? null,
              is_default: member.isDefault,
            },
          } satisfies TeamMember
        })
      )

      return ok(enrichedMembers)
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
    async updateTeamProfilePictureUrl(
      profilePictureUrl
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
          body: { profilePictureUrl },
        }
      )

      if (!response.ok || error || !data) {
        return err(
          repoErrorFromHttp(
            response.status,
            error?.message ?? 'Failed to update team profile picture',
            error
          )
        )
      }

      return ok(data)
    },
  }
}
