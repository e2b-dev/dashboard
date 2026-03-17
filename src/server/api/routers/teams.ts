import { TRPCError } from '@trpc/server'
import z from 'zod'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { api } from '@/lib/clients/api'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import type { ClientTeam } from '@/types/dashboard.types'
import { protectedProcedure } from '../procedures'

function mapApiTeamToClientTeam(
  apiTeam: {
    id: string
    name: string
    slug: string
    tier: string
    email: string
    isDefault: boolean
  },
): ClientTeam {
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

export const teamsRouter = {
  getCurrentTeam: protectedProcedure
    .input(z.object({ teamIdOrSlug: TeamIdOrSlugSchema }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await api.GET('/teams', {
        headers: SUPABASE_AUTH_HEADERS(ctx.session.access_token),
      })

      if (error || !data?.teams) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch teams',
        })
      }

      const apiTeam = data.teams.find(
        (t) => t.slug === input.teamIdOrSlug || t.id === input.teamIdOrSlug
      )

      if (!apiTeam) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Team not found or access denied',
        })
      }

      return mapApiTeamToClientTeam(apiTeam)
    }),
}
