import { TRPCError } from '@trpc/server'
import { millisecondsInDay } from 'date-fns/constants'
import { Sandbox, TimeoutError } from 'e2b'
import { z } from 'zod'
import { authHeaders } from '@/configs/api'
import {
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
import { SANDBOX_RESUME_TIMEOUT_MS } from '@/features/dashboard/sandbox/inspect/constants'
import { SANDBOX_MONITORING_METRICS_RETENTION_MS } from '@/features/dashboard/sandbox/monitoring/utils/constants'
import { TERMINAL_SANDBOX_TIMEOUT_MS } from '@/features/dashboard/terminal/constants'
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

      // OSS: lifecycle events (argus) are unavailable; derive the lifecycle
      // timeline from the sandbox details alone. Kept shape-identical to
      // console so downstream chart code stays unchanged.
      const fallbackPausedAt =
        mappedDetails.state === 'paused' ? mappedDetails.endAt : null
      const fallbackEndedAt =
        mappedDetails.state === 'killed'
          ? (mappedDetails.stoppedAt ?? mappedDetails.endAt)
          : null

      return {
        ...mappedDetails,
        lifecycle: {
          createdAt: mappedDetails.startedAt,
          pausedAt: fallbackPausedAt,
          endedAt: fallbackEndedAt,
          events: [],
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

      try {
        let resolvedSandboxId: string
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
            requestTimeoutMs,
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

        // `Sandbox.create`/`connect` build a full SDK instance but only expose
        // the sandbox id/domain publicly; fetch the envd credentials via the
        // public info endpoint rather than reading the SDK's internal fields.
        // Kept inside this try (with the same requestTimeoutMs) so a stalled
        // GET times out promptly and is normalized like the connect timeout.
        const info = await Sandbox.getFullInfo(resolvedSandboxId, {
          ...connectionOpts,
          requestTimeoutMs,
        })

        // `envdAccessToken` is absent for `secure: false` sandboxes, whose envd
        // is reachable without the `X-Access-Token` header — pass it through
        // as-is rather than treating its absence as a failure.
        return {
          sandboxId: resolvedSandboxId,
          sandboxDomain: info.sandboxDomain,
          envdVersion: info.envdVersion,
          envdAccessToken: info.envdAccessToken,
        }
      } catch (error) {
        if (error instanceof TimeoutError) {
          throw new TRPCError({
            code: 'TIMEOUT',
            message: sandboxId
              ? 'Timed out connecting to terminal sandbox'
              : 'Timed out creating terminal sandbox',
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
    }),

  // Explicit, user-triggered resume of a paused sandbox for the inspect view.
  // The control-plane connect (which resumes + sets TTL) runs server-side so
  // the account token never reaches the browser; returns the sandbox-scoped
  // envd credentials the client uses to rebuild its envd-only client.
  resume: protectedTeamProcedure
    .input(
      z.object({
        sandboxId: SandboxIdSchema,
        requestTimeoutMs: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { sandboxId, requestTimeoutMs } = input
      const { session, teamId } = ctx

      const connectionOpts = {
        apiUrl: process.env.NEXT_PUBLIC_INFRA_API_URL,
        domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
        sandboxUrl: process.env.NEXT_PUBLIC_E2B_SANDBOX_URL,
        headers: authHeaders(session.access_token, teamId),
      }

      try {
        await Sandbox.connect(sandboxId, {
          ...connectionOpts,
          timeoutMs: SANDBOX_RESUME_TIMEOUT_MS,
          requestTimeoutMs: requestTimeoutMs ?? SANDBOX_RESUME_TIMEOUT_MS,
        })

        const info = await Sandbox.getFullInfo(sandboxId, {
          ...connectionOpts,
          requestTimeoutMs: requestTimeoutMs ?? SANDBOX_RESUME_TIMEOUT_MS,
        })

        return {
          sandboxId,
          sandboxDomain: info.sandboxDomain,
          envdVersion: info.envdVersion,
          envdAccessToken: info.envdAccessToken,
        }
      } catch (error) {
        if (error instanceof TimeoutError) {
          throw new TRPCError({
            code: 'TIMEOUT',
            message: 'Timed out resuming sandbox',
            cause: error,
          })
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to resume sandbox',
          cause: error,
        })
      }
    }),

  // Explicit, user-triggered pause of a running sandbox. Uses the SDK's
  // control-plane pause (which snapshots and pauses) server-side so the
  // account token never reaches the browser.
  pause: protectedTeamProcedure
    .input(
      z.object({
        sandboxId: SandboxIdSchema,
        requestTimeoutMs: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { sandboxId, requestTimeoutMs } = input
      const { session, teamId } = ctx

      const connectionOpts = {
        apiUrl: process.env.NEXT_PUBLIC_INFRA_API_URL,
        domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
        sandboxUrl: process.env.NEXT_PUBLIC_E2B_SANDBOX_URL,
        headers: authHeaders(session.access_token, teamId),
      }

      try {
        // Returns false when the sandbox was already paused, which we treat
        // as success since the desired end state is reached.
        await Sandbox.pause(sandboxId, {
          ...connectionOpts,
          ...(requestTimeoutMs ? { requestTimeoutMs } : {}),
        })
      } catch (error) {
        if (error instanceof TimeoutError) {
          throw new TRPCError({
            code: 'TIMEOUT',
            message: 'Timed out pausing sandbox',
            cause: error,
          })
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to pause sandbox',
          cause: error,
        })
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
