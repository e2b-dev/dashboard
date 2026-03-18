import { z } from 'zod'
import { USE_MOCK_DATA } from '@/configs/flags'
import {
  calculateTeamMetricsStep,
  MOCK_SANDBOXES_DATA,
  MOCK_TEAM_METRICS_DATA,
  MOCK_TEAM_METRICS_MAX_DATA,
} from '@/configs/mock-data'
import {
  GetTeamMetricsMaxSchema,
  GetTeamMetricsSchema,
} from '@/core/domains/sandboxes/schemas'
import {
  fillTeamMetricsWithZeros,
  transformMetricsToClientMetrics,
} from '@/core/server/functions/sandboxes/utils'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedTeamProcedure } from '@/core/server/trpc/procedures'

export const sandboxesRouter = createTRPCRouter({
  // QUERIES
  getSandboxes: protectedTeamProcedure.query(async ({ ctx }) => {
    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 200))

      const sandboxes = MOCK_SANDBOXES_DATA()

      return {
        sandboxes,
      }
    }

    const sandboxes = await ctx.services.sandboxes.listSandboxes()

    return {
      sandboxes,
    }
  }),

  getSandboxesMetrics: protectedTeamProcedure
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

      const metricsData =
        await ctx.services.sandboxes.getSandboxesMetrics(sandboxIds)
      const metrics = transformMetricsToClientMetrics(metricsData)

      return {
        metrics,
      }
    }),

  getTeamMetrics: protectedTeamProcedure
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

      const metricData = await ctx.services.sandboxes.getTeamMetricsRange(
        startS,
        endS + overfetchS
      )

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

  getTeamMetricsMax: protectedTeamProcedure
    .input(GetTeamMetricsMaxSchema)
    .query(async ({ ctx, input }) => {
      const { startDate: startDateMs, endDate: endDateMs, metric } = input

      if (USE_MOCK_DATA) {
        return MOCK_TEAM_METRICS_MAX_DATA(startDateMs, endDateMs, metric)
      }

      // convert milliseconds to seconds for the API
      const startS = Math.floor(startDateMs / 1000)
      const endS = Math.floor(endDateMs / 1000)

      const maxMetric = await ctx.services.sandboxes.getTeamMetricsMax(
        startS,
        endS,
        metric
      )

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
