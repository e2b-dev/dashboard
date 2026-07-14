import { z } from 'zod'
import { USE_MOCK_DATA } from '@/configs/env-flags'
import {
  calculateTeamMetricsStep,
  MOCK_METRICS_DATA,
  MOCK_SANDBOXES_DATA,
  MOCK_TEAM_METRICS_DATA,
  MOCK_TEAM_METRICS_MAX_DATA,
} from '@/configs/mock-data'
import type { Sandbox } from '@/core/modules/sandboxes/models'
import { createSandboxesRepository } from '@/core/modules/sandboxes/repository.server'
import {
  GetTeamMetricsMaxSchema,
  GetTeamMetricsSchema,
} from '@/core/modules/sandboxes/schemas'
import { throwTRPCErrorFromRepoError } from '@/core/server/adapters/errors'
import { withTeamAuthedRequestRepository } from '@/core/server/api/middlewares/repository'
import {
  fillTeamMetricsWithZeros,
  transformMetricsToClientMetrics,
} from '@/core/server/functions/sandboxes/utils'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedTeamProcedure } from '@/core/server/trpc/procedures'
import { SandboxIdSchema } from '@/core/shared/schemas/api'

const sandboxesRepositoryProcedure = protectedTeamProcedure.use(
  withTeamAuthedRequestRepository(
    createSandboxesRepository,
    (sandboxesRepository) => ({
      sandboxesRepository,
    })
  )
)

export const sandboxesRouter = createTRPCRouter({
  // QUERIES
  getSandboxes: sandboxesRepositoryProcedure.query(async ({ ctx }) => {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 200))

      return {
        sandboxes: MOCK_SANDBOXES_DATA(),
      }
    }

    const sandboxesResult = await ctx.sandboxesRepository.listSandboxes()
    if (!sandboxesResult.ok) {
      throwTRPCErrorFromRepoError(sandboxesResult.error)
    }

    return {
      sandboxes: sandboxesResult.data,
    }
  }),

  listSandboxesPaginated: sandboxesRepositoryProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        states: z.array(z.enum(['running', 'paused'])).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 200))

        return {
          sandboxes: input.states
            ? MOCK_SANDBOXES_DATA().filter((sandbox) =>
                input.states?.includes(sandbox.state)
              )
            : MOCK_SANDBOXES_DATA(),
          nextCursor: null,
        }
      }

      const sandboxesResult =
        await ctx.sandboxesRepository.listSandboxesPaginated({
          cursor: input.cursor,
          limit: input.limit,
          states: input.states,
        })
      if (!sandboxesResult.ok) {
        throwTRPCErrorFromRepoError(sandboxesResult.error)
      }

      return {
        sandboxes: sandboxesResult.data.sandboxes,
        nextCursor: sandboxesResult.data.nextCursor,
      }
    }),

  // Exact-ID lookup backing the list search: finds a sandbox regardless of
  // which pages the infinite list has loaded. Returns null instead of
  // throwing on 404 so search-as-you-type misses stay silent.
  findSandboxById: sandboxesRepositoryProcedure
    .input(
      z.object({
        sandboxId: SandboxIdSchema,
      })
    )
    .query(async ({ ctx, input }): Promise<Sandbox | null> => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 200))

        return (
          MOCK_SANDBOXES_DATA().find(
            (sandbox) => sandbox.sandboxID === input.sandboxId
          ) ?? null
        )
      }

      const detailsResult = await ctx.sandboxesRepository.getSandboxDetails(
        input.sandboxId
      )
      if (!detailsResult.ok) {
        if (detailsResult.error.status === 404) {
          return null
        }
        throwTRPCErrorFromRepoError(detailsResult.error)
      }

      // The database-record fallback only resolves killed sandboxes, which
      // don't belong in the running/paused list.
      if (detailsResult.data.source !== 'infra') {
        return null
      }

      const details = detailsResult.data.details

      return {
        sandboxID: details.sandboxID,
        clientID: details.clientID,
        templateID: details.templateID,
        alias: details.alias,
        startedAt: details.startedAt,
        endAt: details.endAt,
        cpuCount: details.cpuCount,
        memoryMB: details.memoryMB,
        diskSizeMB: details.diskSizeMB,
        metadata: details.metadata,
        state: details.state,
        envdVersion: details.envdVersion,
      }
    }),

  getSandboxesMetrics: sandboxesRepositoryProcedure
    .input(
      z.object({
        sandboxIds: z.array(z.string()),
      })
    )
    .query(async ({ ctx, input }) => {
      const { sandboxIds } = input

      if (sandboxIds.length === 0 || USE_MOCK_DATA) {
        return {
          metrics: {},
        }
      }

      const metricsDataResult =
        await ctx.sandboxesRepository.getSandboxesMetrics(sandboxIds)
      if (!metricsDataResult.ok) {
        throwTRPCErrorFromRepoError(metricsDataResult.error)
      }
      const metricsData = metricsDataResult.data
      const metrics = transformMetricsToClientMetrics(metricsData)

      return {
        metrics,
      }
    }),

  getTeamMetrics: sandboxesRepositoryProcedure
    .input(GetTeamMetricsSchema)
    .query(async ({ ctx, input }) => {
      const { startDate: startDateMs, endDate: endDateMs } = input

      // use mock data if enabled
      if (USE_MOCK_DATA) {
        const mockData = MOCK_TEAM_METRICS_DATA(startDateMs, endDateMs)
        const filledMetrics = fillTeamMetricsWithZeros(
          mockData.metrics,
          startDateMs,
          endDateMs,
          mockData.step
        )
        return {
          metrics: filledMetrics,
          step: mockData.step,
        }
      }

      const startS = Math.floor(startDateMs / 1000)
      const endS = Math.floor(endDateMs / 1000)

      // calculate step to determine overfetch amount
      const stepMs = calculateTeamMetricsStep(startDateMs, endDateMs)

      // overfetch by one step
      // the overfetch is accounted for when post-processing the data using fillTeamMetricsWithZeros
      const overfetchS = Math.ceil(stepMs / 1000)

      const metricDataResult =
        await ctx.sandboxesRepository.getTeamMetricsRange(
          startS,
          endS + overfetchS
        )
      if (!metricDataResult.ok) {
        throwTRPCErrorFromRepoError(metricDataResult.error)
      }
      const metricData = metricDataResult.data

      // transform timestamps from seconds to milliseconds
      const metrics = metricData.map(
        (d: {
          concurrentSandboxes: number
          sandboxStartRate: number
          timestampUnix: number
        }) => ({
          concurrentSandboxes: d.concurrentSandboxes,
          sandboxStartRate: d.sandboxStartRate,
          timestamp: d.timestampUnix * 1000,
        })
      )

      // fill gaps with zeros for smooth visualization
      const filledMetrics = fillTeamMetricsWithZeros(
        metrics,
        startDateMs,
        endDateMs,
        stepMs
      )

      return {
        metrics: filledMetrics,
        step: stepMs,
      }
    }),

  getTeamMetricsMax: sandboxesRepositoryProcedure
    .input(GetTeamMetricsMaxSchema)
    .query(async ({ ctx, input }) => {
      const { startDate: startDateMs, endDate: endDateMs, metric } = input

      if (USE_MOCK_DATA) {
        return MOCK_TEAM_METRICS_MAX_DATA(startDateMs, endDateMs, metric)
      }

      // convert milliseconds to seconds for the API
      const startS = Math.floor(startDateMs / 1000)
      const endS = Math.floor(endDateMs / 1000)

      const maxMetricResult = await ctx.sandboxesRepository.getTeamMetricsMax(
        startS,
        endS,
        metric
      )
      if (!maxMetricResult.ok) {
        throwTRPCErrorFromRepoError(maxMetricResult.error)
      }
      const maxMetric = maxMetricResult.data

      // since javascript timestamps are in milliseconds, we want to convert the timestamp back to milliseconds
      const timestampMs = maxMetric.timestampUnix * 1000

      return {
        timestamp: timestampMs,
        value: maxMetric.value,
        metric,
      }
    }),

  // MUTATIONS
})
