import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { repoErrorFromHttp } from '@/core/shared/errors'
import { err, ok, type RepoResult } from '@/core/shared/result'
import { api } from '@/lib/clients/api'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import type { components as DashboardComponents } from '@/types/dashboard-api.types'
import type { ClientTeam, ResolvedTeam, TeamLimits, TeamMember } from './models'

type ApiUserTeam = {
  id: string
  name: string
  slug: string
  tier: string
  email: string
  isDefault: boolean
  limits: {
    concurrentSandboxes: number
    diskMb: number
    maxLengthHours: number
    maxRamMb: number
    maxVcpu: number
  }
}

function mapApiTeamToClientTeam(apiTeam: ApiUserTeam): ClientTeam {
  return {
    id: apiTeam.id,
    name: apiTeam.name,
    slug: apiTeam.slug,
    tier: apiTeam.tier,
    email: apiTeam.email,
    is_default: apiTeam.isDefault,
    is_banned: false,
    is_blocked: false,
    blocked_reason: null,
    cluster_id: null,
    created_at: '',
    profile_picture_url: null,
  }
}

type TeamsRepositoryDeps = {
  apiClient: typeof api
  authHeaders: typeof SUPABASE_AUTH_HEADERS
  adminClient: typeof supabaseAdmin
}

export interface TeamsRequestScope {
  accessToken: string
  teamId?: string
}

export interface TeamsRepository {
  listUserTeams(): Promise<RepoResult<ClientTeam[]>>
  getCurrentUserTeam(teamIdOrSlug: string): Promise<RepoResult<ClientTeam>>
  resolveTeamBySlug(
    slug: string,
    next?: { tags?: string[] }
  ): Promise<RepoResult<ResolvedTeam>>
  getTeamLimitsByIdOrSlug(teamIdOrSlug: string): Promise<RepoResult<TeamLimits>>
  listTeamMembers(): Promise<RepoResult<TeamMember[]>>
  updateTeamName(
    name: string
  ): Promise<RepoResult<DashboardComponents['schemas']['UpdateTeamResponse']>>
  addTeamMember(email: string): Promise<RepoResult<void>>
  removeTeamMember(userId: string): Promise<RepoResult<void>>
  updateTeamProfilePictureUrl(
    profilePictureUrl: string
  ): Promise<RepoResult<ClientTeam>>
}

export function createTeamsRepository(
  scope: TeamsRequestScope,
  deps: TeamsRepositoryDeps = {
    apiClient: api,
    authHeaders: SUPABASE_AUTH_HEADERS,
    adminClient: supabaseAdmin,
  }
): TeamsRepository {
  const requireTeamId = (teamId?: string): string => {
    if (!teamId) {
      throw new Error('teamId is required in request scope')
    }
    return teamId
  }

  const listApiUserTeams = async (
    accessToken: string
  ): Promise<RepoResult<ApiUserTeam[]>> => {
    const { data, error, response } = await deps.apiClient.GET('/teams', {
      headers: deps.authHeaders(accessToken),
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

    return ok(data.teams as ApiUserTeam[])
  }

  return {
    async listUserTeams(): Promise<RepoResult<ClientTeam[]>> {
      const teamsResult = await listApiUserTeams(scope.accessToken)

      if (!teamsResult.ok) {
        return teamsResult
      }

      return ok(teamsResult.data.map(mapApiTeamToClientTeam))
    },
    async getCurrentUserTeam(
      teamIdOrSlug: string
    ): Promise<RepoResult<ClientTeam>> {
      const teamsResult = await listApiUserTeams(scope.accessToken)

      if (!teamsResult.ok) {
        return teamsResult
      }

      const team = teamsResult.data.find(
        (candidate) =>
          candidate.id === teamIdOrSlug || candidate.slug === teamIdOrSlug
      )

      if (!team) {
        return err(
          repoErrorFromHttp(403, 'Team not found or access denied', {
            teamIdOrSlug,
          })
        )
      }

      return ok(mapApiTeamToClientTeam(team))
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
          next,
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
    async getTeamLimitsByIdOrSlug(
      teamIdOrSlug: string
    ): Promise<RepoResult<TeamLimits>> {
      const teamsResult = await listApiUserTeams(scope.accessToken)

      if (!teamsResult.ok) {
        return teamsResult
      }

      const team = teamsResult.data.find(
        (candidate) =>
          candidate.id === teamIdOrSlug || candidate.slug === teamIdOrSlug
      )

      if (!team) {
        return err(repoErrorFromHttp(404, 'Team not found'))
      }

      return ok({
        concurrentInstances: team.limits.concurrentSandboxes,
        diskMb: team.limits.diskMb,
        maxLengthHours: team.limits.maxLengthHours,
        maxRamMb: team.limits.maxRamMb,
        maxVcpu: team.limits.maxVcpu,
      })
    },
    async listTeamMembers(): Promise<RepoResult<TeamMember[]>> {
      const teamId = requireTeamId(scope.teamId)
      const { data, error, response } = await deps.apiClient.GET(
        '/teams/{teamId}/members',
        {
          params: { path: { teamId } },
          headers: deps.authHeaders(scope.accessToken, teamId),
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
      const teamId = requireTeamId(scope.teamId)
      const { data, error, response } = await deps.apiClient.PATCH(
        '/teams/{teamId}',
        {
          params: { path: { teamId } },
          headers: deps.authHeaders(scope.accessToken, teamId),
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
      const teamId = requireTeamId(scope.teamId)
      const { error, response } = await deps.apiClient.POST(
        '/teams/{teamId}/members',
        {
          params: { path: { teamId } },
          headers: deps.authHeaders(scope.accessToken, teamId),
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
      const teamId = requireTeamId(scope.teamId)
      const { error, response } = await deps.apiClient.DELETE(
        '/teams/{teamId}/members/{userId}',
        {
          params: { path: { teamId, userId } },
          headers: deps.authHeaders(scope.accessToken, teamId),
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
    ): Promise<RepoResult<ClientTeam>> {
      const teamId = requireTeamId(scope.teamId)
      const { data, error } = await deps.adminClient
        .from('teams')
        .update({ profile_picture_url: profilePictureUrl })
        .eq('id', teamId)
        .select()
        .single()

      if (error || !data) {
        return err(
          repoErrorFromHttp(500, error?.message ?? 'Failed to update team')
        )
      }

      return ok(data as ClientTeam)
    },
  }
}
