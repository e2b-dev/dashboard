import 'server-cli-only'

import { z } from 'zod'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { api } from '@/lib/clients/api'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { returnServerError } from '@/lib/utils/action'
import type { ClientTeam } from '@/types/dashboard.types'

const GetTeamSchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
})

export const getTeam = authActionClient
  .schema(GetTeamSchema)
  .metadata({ serverFunctionName: 'getTeam' })
  .use(withTeamIdResolution)
  .action(async ({ ctx }) => {
    const { teamId, session } = ctx

    const { data, error } = await api.GET('/teams', {
      headers: SUPABASE_AUTH_HEADERS(session.access_token),
    })

    if (error || !data?.teams) {
      return returnServerError('Failed to fetch team')
    }

    const apiTeam = data.teams.find((t) => t.id === teamId)

    if (!apiTeam) {
      return returnServerError('Team not found')
    }

    const team: ClientTeam = {
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

    return team
  })

export const getUserTeams = authActionClient
  .metadata({ serverFunctionName: 'getUserTeams' })
  .action(async ({ ctx }) => {
    const { session } = ctx

    const { data, error } = await api.GET('/teams', {
      headers: SUPABASE_AUTH_HEADERS(session.access_token),
    })

    if (error || !data?.teams || data.teams.length === 0) {
      return returnServerError('No teams found.')
    }

    const teams: ClientTeam[] = data.teams.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      tier: t.tier,
      email: t.email,
      is_default: t.isDefault,
      is_banned: false,
      is_blocked: false,
      blocked_reason: null,
      cluster_id: null,
      created_at: '',
      profile_picture_url: null,
    }))

    return teams
  })
