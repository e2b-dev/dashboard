import { context, SpanStatusCode, trace } from '@opentelemetry/api'
import z from 'zod'
import { forbiddenTeamAccessError } from '@/core/server/adapters/trpc-errors'
import { authMiddleware } from '@/core/server/api/middlewares/auth'
import {
  endTelemetryMiddleware,
  startTelemetryMiddleware,
} from '@/core/server/api/middlewares/telemetry'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'
import { getTracer } from '@/core/shared/clients/tracer'
import { TeamSlugSchema } from '@/core/shared/schemas/team'
import { t } from './init'

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
 * Used to create protected routes that require authentication and a team authorization, via teamSlug.
 *
 */
export const protectedTeamProcedure = t.procedure
  .use(startTelemetryMiddleware)
  .use(authMiddleware)
  .input(
    z.object({
      teamSlug: TeamSlugSchema,
    })
  )
  .use(async ({ ctx, next, input }) => {
    const tracer = getTracer()
    const span = tracer.startSpan('trpc.middleware.teamAuth')
    span.setAttribute('trpc.middleware.name', 'teamAuth')

    try {
      const teamId = await context.with(
        trace.setSpan(context.active(), span),
        async () => {
          return await getTeamIdFromSlug(
            input.teamSlug,
            ctx.session.access_token
          )
        }
      )

      if (!teamId) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `teamId not found for teamSlug (${input.teamSlug})`,
        })

        throw forbiddenTeamAccessError()
      }

      span.setStatus({ code: SpanStatusCode.OK })

      // add teamId to context - endTelemetryMiddleware will pick it up for logging
      return next({
        ctx: {
          ...ctx,
          teamId,
        },
      })
    } finally {
      span.end()
    }
  })
  .use(endTelemetryMiddleware)
