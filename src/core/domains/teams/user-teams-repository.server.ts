import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { repoErrorFromHttp } from '@/core/shared/errors'
import type { RequestScope } from '@/core/shared/repository-scope'
import { err, ok, type RepoResult } from '@/core/shared/result'
import { api } from '@/lib/clients/api'
import type { ClientTeam, ResolvedTeam } from './models'

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

type UserTeamsRepositoryDeps = {
  apiClient: typeof api
  authHeaders: typeof SUPABASE_AUTH_HEADERS
}

export type UserTeamsRequestScope = RequestScope

export interface UserTeamsRepository {
  listUserTeams(): Promise<RepoResult<ClientTeam[]>>
  getCurrentUserTeam(teamIdOrSlug: string): Promise<RepoResult<ClientTeam>>
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
  const listApiUserTeams = async (): Promise<RepoResult<ApiUserTeam[]>> => {
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

    return ok(data.teams as ApiUserTeam[])
  }

  return {
    async listUserTeams(): Promise<RepoResult<ClientTeam[]>> {
      const teamsResult = await listApiUserTeams()

      if (!teamsResult.ok) {
        return teamsResult
      }

      return ok(teamsResult.data.map(mapApiTeamToClientTeam))
    },
    async getCurrentUserTeam(
      teamIdOrSlug: string
    ): Promise<RepoResult<ClientTeam>> {
      const teamsResult = await listApiUserTeams()

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
  }
}
