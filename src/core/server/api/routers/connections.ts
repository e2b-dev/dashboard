import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import {
  DevinConnectionError,
  discoverDevinAccount,
  normalizeDevinApiUrl,
} from '@/core/modules/devin-outposts/client.server'
import {
  DevinWorkerLaunchError,
  disconnectDevinWorkers,
  launchDevinWorker,
} from '@/core/modules/devin-outposts/worker.server'
import { featureFlags } from '@/core/modules/feature-flags/feature-flags.server'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedTeamProcedure } from '@/core/server/trpc/procedures'

const connectionsProcedure = protectedTeamProcedure.use(
  async ({ ctx, next }) => {
    const enabled = await featureFlags.isEnabled('connectionsEnabled', {
      user: {
        id: ctx.session.user.id,
        email: ctx.session.user.email ?? undefined,
      },
      team: { id: ctx.teamId },
    })

    if (!enabled) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }

    return next()
  }
)

export const connectionsRouter = createTRPCRouter({
  disconnectDevinWorkers: connectionsProcedure
    .input(z.object({ confirm: z.literal(true) }))
    .mutation(async ({ ctx }) => {
      try {
        return await disconnectDevinWorkers({
          accessToken: ctx.session.access_token,
          teamId: ctx.teamId,
          userId: ctx.session.user.id,
        })
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not disconnect the Devin workers',
        })
      }
    }),

  discoverDevin: connectionsProcedure
    .input(
      z.object({
        apiKey: z.string().trim().min(1).max(4096),
        apiUrl: z.string().trim().min(1).max(512),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await discoverDevinAccount(input.apiUrl, input.apiKey)
      } catch (error) {
        if (error instanceof DevinConnectionError) {
          throw new TRPCError({
            code:
              error.kind === 'credentials'
                ? 'UNAUTHORIZED'
                : error.kind === 'url'
                  ? 'BAD_REQUEST'
                  : 'BAD_GATEWAY',
            message: error.message,
          })
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not check the Devin account',
        })
      }
    }),

  launchDevinWorker: connectionsProcedure
    .input(
      z.object({
        apiUrl: z.string().trim().min(1).max(512),
        operationId: z.uuid(),
        outpostsToken: z.string().trim().min(1).max(4096),
        poolId: z.string().trim().min(1).max(256),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        normalizeDevinApiUrl(input.apiUrl)
      } catch (error) {
        if (error instanceof DevinConnectionError) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })
        }
        throw error
      }
      try {
        return await launchDevinWorker({
          accessToken: ctx.session.access_token,
          apiUrl: input.apiUrl,
          operationId: input.operationId,
          outpostsToken: input.outpostsToken,
          poolId: input.poolId,
          teamId: ctx.teamId,
          userId: ctx.session.user.id,
        })
      } catch (error) {
        const orphanedSandboxId =
          error instanceof DevinWorkerLaunchError
            ? error.orphanedSandboxId
            : undefined
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: orphanedSandboxId
            ? `Failed to start the Devin worker. Sandbox ${orphanedSandboxId} may require cleanup.`
            : 'Failed to start the Devin Outposts worker',
        })
      }
    }),
})
