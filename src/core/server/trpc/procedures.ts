import { authMiddleware } from '@/core/server/api/middlewares/auth'
import {
  endTelemetryMiddleware,
  startTelemetryMiddleware,
} from '@/core/server/api/middlewares/telemetry'
import { t } from './init'

/**
 * IMPORTANT: Telemetry Middleware Usage
 *
 * When using telemetry middlewares, ALWAYS use BOTH start and end together:
 * - startTelemetryMiddleware: Must be FIRST in the chain
 * - endTelemetryMiddleware: Must be placed AFTER domain middlewares (auth, etc)
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
 * Used to create protected routes that require the team API key (cookie or
 * E2B_API_KEY env). Includes telemetry for observability.
 */
export const protectedProcedure = t.procedure
  .use(startTelemetryMiddleware)
  .use(authMiddleware)
  .use(endTelemetryMiddleware)
