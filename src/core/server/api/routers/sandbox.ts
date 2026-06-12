import { TRPCError } from '@trpc/server'
import { millisecondsInDay } from 'date-fns/constants'
import { Sandbox } from 'e2b'
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
  DEFAULT_CWD,
  TERMINAL_SANDBOX_TIMEOUT_MS,
} from '@/features/dashboard/terminal/constants'
import {
  getTerminalEnvVars,
  setTerminalEnvVar,
} from '@/features/dashboard/terminal/env-vars.server'
import { getTerminalEnvVarNames } from '@/features/dashboard/terminal/secret-envs.server'
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

  terminalEnvVars: protectedTeamProcedure
    .input(
      z.object({
        sandboxId: SandboxIdSchema.optional(),
        template: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      let template = normalizeTerminalTemplate(input.template)

      if (input.sandboxId) {
        const sandbox = await Sandbox.connect(input.sandboxId, {
          apiUrl: process.env.NEXT_PUBLIC_INFRA_API_URL,
          domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
          sandboxUrl: process.env.NEXT_PUBLIC_E2B_SANDBOX_URL,
          timeoutMs: TERMINAL_SANDBOX_TIMEOUT_MS,
          headers: authHeaders(ctx.session.access_token, ctx.teamId),
        })
        const info = await sandbox.getInfo()

        template =
          normalizeTerminalTemplate(
            info.metadata.template ?? info.name ?? info.templateId
          ) ?? template
      }

      if (!template) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid terminal template.',
        })
      }

      return {
        template,
        names: getTerminalEnvVarNames(template),
      }
    }),

  createTerminalPty: protectedTeamProcedure
    .input(
      z.object({
        sandboxId: SandboxIdSchema,
        template: z.string(),
        cols: z.number().int().positive(),
        rows: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = normalizeTerminalTemplate(input.template)
      if (!template) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid terminal template.',
        })
      }

      const sandbox = await Sandbox.connect(input.sandboxId, {
        apiUrl: process.env.NEXT_PUBLIC_INFRA_API_URL,
        domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
        sandboxUrl: process.env.NEXT_PUBLIC_E2B_SANDBOX_URL,
        timeoutMs: TERMINAL_SANDBOX_TIMEOUT_MS,
        headers: authHeaders(ctx.session.access_token, ctx.teamId),
      })
      const pty = await sandbox.pty.create({
        cols: input.cols,
        rows: input.rows,
        timeoutMs: 0,
        cwd: DEFAULT_CWD,
        envs: getTerminalEnvVars(input.sandboxId),
        onData: () => undefined,
      })
      await pty.disconnect()

      return {
        pid: pty.pid,
      }
    }),

  setTerminalEnvVar: protectedTeamProcedure
    .input(
      z.object({
        sandboxId: SandboxIdSchema,
        name: z.string().min(1).max(128),
        value: z.string().min(1).max(32_768),
      })
    )
    .mutation(async ({ input }) => {
      const name = setTerminalEnvVar(input)
      if (!name) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid environment variable name.',
        })
      }

      return {
        name,
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
