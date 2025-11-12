import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import z from 'zod'
import checkUserTeamAuth from '../auth/check-user-team-auth'
import { getTeamIdFromSegment } from '../team/get-team-id-from-segment'
import { forbiddenTeamAccessError } from './errors'
import { t } from './init'
import { authMiddleware } from './middlewares/auth'
import {
  endTelemetryMiddleware,
  startTelemetryMiddleware,
} from './middlewares/telemetry'

/**
 * IMPORTANT: Telemetry Middleware Usage
 *
 * When using telemetry middlewares, ALWAYS use BOTH start and end together:
 * - startTelemetryMiddleware: Must be FIRST in the chain
 * - endTelemetryMiddleware: Must be placed AFTER domain middlewares (auth, team, etc)
 *
 * Never use only one of them - they work as a pair to capture full timing
 * and collect enriched context from downstream middlewares.
 *
 * Correct:
 *   .use(startTelemetryMiddleware)
 *   .use(authMiddleware)
 *   .use(endTelemetryMiddleware)
 *
 * Wrong:
 *   .use(startTelemetryMiddleware)  // missing end!
 *   .use(authMiddleware)
 */

/**
 * Public Procedure
 *
 * Used to create public routes that are not protected by authentication.
 */
export const publicProcedure = t.procedure
  .use(startTelemetryMiddleware)
  .use(endTelemetryMiddleware)

/**
 * Protected Procedure
 *
 * Used to create protected routes that require authentication.
 * Includes telemetry for observability.
 *
 */
export const protectedProcedure = t.procedure
  .use(startTelemetryMiddleware)
  .use(authMiddleware)
  .use(endTelemetryMiddleware)

/**
 * Protected Team Procedure
 *
 * Used to create protected routes that require authentication and a team authorization, via teamIdOrSlug.
 *
 */
export const protectedTeamProcedure = t.procedure
  .use(startTelemetryMiddleware)
  .use(authMiddleware)
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

    // add teamId to context - endTelemetryMiddleware will pick it up for logging
    return next({
      ctx: {
        ...ctx,
        teamId,
      },
    })
  })
  .use(endTelemetryMiddleware)
