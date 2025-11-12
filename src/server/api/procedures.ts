import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import z from 'zod'
import checkUserTeamAuth from '../auth/check-user-team-auth'
import { getTeamIdFromSegment } from '../team/get-team-id-from-segment'
import { forbiddenTeamAccessError, unauthorizedUserError } from './errors'
import { t } from './init'
import { telemetryMiddleware } from './middlewares/telemetry'

/**
 * Public Procedure
 *
 * Used to create public routes that are not protected by authentication.
 * Includes telemetry for observability.
 */
export const publicProcedure = t.procedure.use(telemetryMiddleware)

/**
 * Protected Procedure
 *
 * Used to create protected routes that require authentication.
 * Includes telemetry for observability.
 */
export const protectedProcedure = t.procedure
  .use(telemetryMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.user || !ctx.session) {
      throw unauthorizedUserError()
    }

    return next({
      ctx: {
        session: ctx.session,
        user: ctx.user,
      },
    })
  })

/**
 * Protected Team Procedure
 *
 * Used to create protected routes that require authentication and a team authorization, via teamIdOrSlug.
 */
export const protectedTeamProcedure = protectedProcedure
  .input(
    z.object({
      teamIdOrSlug: TeamIdOrSlugSchema,
    })
  )
  .use(async ({ ctx, next, input }) => {
    const teamId = await getTeamIdFromSegment(input.teamIdOrSlug)

    if (!teamId) {
      // the actual error should be 400, but we want to prevent leaking information to bad actors
      throw forbiddenTeamAccessError()
    }

    const isAuthorized = await checkUserTeamAuth(ctx.user.id, teamId)

    if (!isAuthorized) {
      throw forbiddenTeamAccessError()
    }

    return next({
      ctx: {
        ...ctx,
        teamId,
      },
    })
  })
