import { TRPCError } from '@trpc/server'
import { millisecondsInDay } from 'date-fns/constants'
import { Sandbox, TimeoutError } from 'e2b'
import { z } from 'zod'
import { authHeaders } from '@/configs/api'
import {
  deriveSandboxLifecycleFromEvents,
  mapApiSandboxRecordToModel,
  mapInfraSandboxDetailsToModel,
  mapInfraSandboxLogToModel,
  type SandboxDetailsModel,
  type SandboxLogModel,
  type SandboxLogsModel,
} from '@/core/modules/sandboxes/models'
import { createSandboxesRepository } from '@/core/modules/sandboxes/repository.server'
import { throwTRPCErrorFromRepoError } from '@/core/server/adapters/errors'
import { withTeamAuthedRequestRepository } from '@/core/server/api/middlewares/repository'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedTeamProcedure } from '@/core/server/trpc/procedures'
import { SandboxIdSchema } from '@/core/shared/schemas/api'
import { SANDBOX_MONITORING_METRICS_RETENTION_MS } from '@/features/dashboard/sandbox/monitoring/utils/constants'
import {
  TERMINAL_SANDBOX_TIMEOUT_ERROR,
  TERMINAL_SANDBOX_TIMEOUT_MS,
} from '@/features/dashboard/terminal/constants'
import { normalizeTerminalTemplate } from '@/features/dashboard/terminal/template'

const sandboxRepositoryProcedure = protectedTeamProcedure.use(
  withTeamAuthedRequestRepository(
    createSandboxesRepository,
    (sandboxesRepository) => ({
      sandboxesRepository,
    })
  )
)

export const sandboxRouter = createTRPCRouter({
  // QUERIES

  details: sandboxRepositoryProcedure
    .input(
      z.object({
        sandboxId: SandboxIdSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      const { sandboxId } = input

      const detailsResult =
        await ctx.sandboxesRepository.getSandboxDetails(sandboxId)
      if (!detailsResult.ok) {
        throwTRPCErrorFromRepoError(detailsResult.error)
      }

      const mappedDetails: SandboxDetailsModel =
        detailsResult.data.source === 'infra'
          ? mapInfraSandboxDetailsToModel(detailsResult.data.details)
          : mapApiSandboxRecordToModel(detailsResult.data.details)

      const lifecycleEventsResult =
        await ctx.sandboxesRepository.getSandboxLifecycleEvents(sandboxId)
      if (!lifecycleEventsResult.ok) {
        throwTRPCErrorFromRepoError(lifecycleEventsResult.error)
      }
      const derivedLifecycle = deriveSandboxLifecycleFromEvents(
        lifecycleEventsResult.data
      )
      const fallbackPausedAt =
        mappedDetails.state === 'paused' ? mappedDetails.endAt : null
      const fallbackEndedAt =
        mappedDetails.state === 'killed'
          ? (mappedDetails.stoppedAt ?? mappedDetails.endAt)
          : null

      return {
        ...mappedDetails,
        lifecycle: {
          createdAt: derivedLifecycle.createdAt ?? mappedDetails.startedAt,
          pausedAt: derivedLifecycle.pausedAt ?? fallbackPausedAt,
          endedAt: derivedLifecycle.endedAt ?? fallbackEndedAt,
          events: derivedLifecycle.events,
        },
      }
    }),

  logsBackwardsReversed: sandboxRepositoryProcedure
    .input(
      z.object({
        sandboxId: SandboxIdSchema,
        cursor: z.number().optional(),
        level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
        search: z.string().max(256).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { sandboxId, level, search } = input
      let { cursor } = input

      cursor ??= Date.now()

      const direction = 'backward'
      const limit = 100

      const sandboxLogsResult = await ctx.sandboxesRepository.getSandboxLogs(
        sandboxId,
        { cursor, limit, direction, level, search }
      )
      if (!sandboxLogsResult.ok) {
        throwTRPCErrorFromRepoError(sandboxLogsResult.error)
      }
      const sandboxLogs = sandboxLogsResult.data

      const logs: SandboxLogModel[] = sandboxLogs.logs
        .map(mapInfraSandboxLogToModel)
        .reverse()

      const hasMore = logs.length === limit
      const cursorLog = logs[0]
      const nextCursor = hasMore ? (cursorLog?.timestampUnix ?? null) : null

      const result: SandboxLogsModel = {
        logs,
        nextCursor,
      }

      return result
    }),

  logsForward: sandboxRepositoryProcedure
    .input(
      z.object({
        sandboxId: SandboxIdSchema,
        cursor: z.number().optional(),
        level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
        search: z.string().max(256).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { sandboxId, level, search } = input
      let { cursor } = input

      cursor ??= Date.now()

      const direction = 'forward'
      const limit = 100

      const sandboxLogsResult = await ctx.sandboxesRepository.getSandboxLogs(
        sandboxId,
        { cursor, limit, direction, level, search }
      )
      if (!sandboxLogsResult.ok) {
        throwTRPCErrorFromRepoError(sandboxLogsResult.error)
      }
      const sandboxLogs = sandboxLogsResult.data

      const logs: SandboxLogModel[] = sandboxLogs.logs.map(
        mapInfraSandboxLogToModel
      )

      const newestLog = logs[logs.length - 1]
      const nextCursor = newestLog?.timestampUnix ?? cursor

      const result: SandboxLogsModel = {
        logs,
        nextCursor,
      }

      return result
    }),

  resourceMetrics: sandboxRepositoryProcedure
    .input(
      z
        .object({
          sandboxId: SandboxIdSchema,
          startMs: z.number().int().positive(),
          endMs: z.number().int().positive(),
        })
        .refine(({ startMs, endMs }) => startMs < endMs, {
          message: 'startMs must be before endMs',
        })
        .refine(
          ({ startMs, endMs }) => {
            const now = Date.now()
            return (
              startMs >= now - SANDBOX_MONITORING_METRICS_RETENTION_MS &&
              endMs <= now + millisecondsInDay
            )
          },
          {
            message:
              'Time range must be within metrics retention window (7 days) and 1 day from now',
          }
        )
    )
    .query(async ({ ctx, input }) => {
      const { sandboxId } = input
      const { startMs, endMs } = input

      const metricsResult = await ctx.sandboxesRepository.getSandboxMetrics(
        sandboxId,
        {
          startUnixMs: startMs,
          endUnixMs: endMs,
        }
      )
      if (!metricsResult.ok) {
        throwTRPCErrorFromRepoError(metricsResult.error)
      }
      const metrics = metricsResult.data

      return metrics
    }),

  // MUTATIONS

  // Runs the control-plane create/connect server-side so the user's
  // account-level access token never reaches the browser. Returns only the
  // sandbox-scoped envd credentials the client needs for PTY access.
  openTerminal: protectedTeamProcedure
    .input(
      z.object({
        template: z.string().min(1, 'Template is required'),
        sandboxId: SandboxIdSchema.optional(),
        requestTimeoutMs: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { sandboxId, template, requestTimeoutMs } = input
      const { session, teamId } = ctx

      const normalizedTemplate = normalizeTerminalTemplate(template)
      if (!normalizedTemplate) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid terminal template',
        })
      }

      const connectionOpts = {
        apiUrl: process.env.NEXT_PUBLIC_INFRA_API_URL,
        domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
        sandboxUrl: process.env.NEXT_PUBLIC_E2B_SANDBOX_URL,
        headers: authHeaders(session.access_token, teamId),
      }

      let resolvedSandboxId: string
      try {
        if (sandboxId) {
          const sandbox = await Sandbox.connect(sandboxId, {
            ...connectionOpts,
            timeoutMs: TERMINAL_SANDBOX_TIMEOUT_MS,
            requestTimeoutMs,
          })
          resolvedSandboxId = sandbox.sandboxId
        } else {
          const sandbox = await Sandbox.create(normalizedTemplate, {
            ...connectionOpts,
            timeoutMs: TERMINAL_SANDBOX_TIMEOUT_MS,
            lifecycle: {
              onTimeout: 'pause',
              autoResume: true,
            },
            metadata: {
              source: 'dashboard-terminal',
              template: normalizedTemplate,
              userId: session.user.id,
            },
          })
          resolvedSandboxId = sandbox.sandboxId
        }
      } catch (error) {
        // Surface timeouts with a stable sentinel so the client can rethrow a
        // TimeoutError and let the attach-retry logic recognize them.
        if (error instanceof TimeoutError) {
          throw new TRPCError({
            code: 'TIMEOUT',
            message: TERMINAL_SANDBOX_TIMEOUT_ERROR,
            cause: error,
          })
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: sandboxId
            ? 'Failed to connect to terminal sandbox'
            : 'Failed to create terminal sandbox',
          cause: error,
        })
      }

      // `Sandbox.create`/`connect` build a full SDK instance but only expose
      // the sandbox id/domain publicly; fetch the envd credentials via the
      // public info endpoint rather than reading the SDK's internal fields.
      const info = await Sandbox.getFullInfo(resolvedSandboxId, connectionOpts)

      if (!info.envdAccessToken) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Sandbox is not ready for terminal access',
        })
      }

      return {
        sandboxId: resolvedSandboxId,
        sandboxDomain: info.sandboxDomain,
        envdVersion: info.envdVersion,
        envdAccessToken: info.envdAccessToken,
      }
    }),

  killTerminalPty: protectedTeamProcedure
    .input(
      z.object({
        sandboxId: SandboxIdSchema,
        pid: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sandbox = await Sandbox.connect(input.sandboxId, {
        apiUrl: process.env.NEXT_PUBLIC_INFRA_API_URL,
        domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
        sandboxUrl: process.env.NEXT_PUBLIC_E2B_SANDBOX_URL,
        timeoutMs: TERMINAL_SANDBOX_TIMEOUT_MS,
        headers: authHeaders(ctx.session.access_token, ctx.teamId),
      })

      return sandbox.pty.kill(input.pid)
    }),
})
