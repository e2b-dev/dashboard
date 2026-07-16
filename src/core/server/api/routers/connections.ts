import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import {
  createDevinPool,
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

function mapDevinError(error: DevinConnectionError) {
  return new TRPCError({
    code:
      error.kind === 'credentials'
        ? 'UNAUTHORIZED'
        : error.kind === 'url'
          ? 'BAD_REQUEST'
          : error.status === 409
            ? 'CONFLICT'
            : error.status === 400 || error.status === 422
              ? 'BAD_REQUEST'
              : 'BAD_GATEWAY',
    message: error.message,
  })
}

export const connectionsRouter = createTRPCRouter({
  createDevinPool: connectionsProcedure
    .input(
      z.object({
        apiKey: z.string().trim().min(1).max(4096),
        apiUrl: z.string().trim().min(1).max(512),
        description: z.string().trim().max(500).optional(),
        name: z
          .string()
          .trim()
          .regex(
            /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/,
            'Pool name must start with a letter or number and use only letters, numbers, dots, underscores, or hyphens'
          ),
      })
    )
    .mutation(async ({ input }) => {
      const description =
        input.description || `E2B Devin Outposts pool (${input.name})`
      let apiUrl: string
      try {
        apiUrl = normalizeDevinApiUrl(input.apiUrl)
      } catch (error) {
        if (error instanceof DevinConnectionError) throw mapDevinError(error)
        throw error
      }

      try {
        const discovered = await discoverDevinAccount(apiUrl, input.apiKey)
        if (discovered.pools.some((pool) => pool.name === input.name)) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `An Outposts pool named ${input.name} already exists`,
          })
        }
        return {
          pool: await createDevinPool(apiUrl, input.apiKey, {
            description,
            name: input.name,
          }),
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        if (error instanceof DevinConnectionError) throw mapDevinError(error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not create the Devin Outposts pool',
        })
      }
    }),

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
        if (error instanceof DevinConnectionError) throw mapDevinError(error)
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
