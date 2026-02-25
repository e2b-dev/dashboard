import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { USE_MOCK_DATA } from '@/configs/flags'
import {
  calculateTeamMetricsStep,
  MOCK_SANDBOXES_DATA,
  MOCK_TEAM_METRICS_DATA,
  MOCK_TEAM_METRICS_MAX_DATA,
} from '@/configs/mock-data'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import {
  fillTeamMetricsWithZeros,
  transformMetricsToClientMetrics,
} from '@/server/sandboxes/utils'
import { z } from 'zod'
import { apiError } from '../errors'
import { createTRPCRouter } from '../init'
import { protectedTeamProcedure } from '../procedures'
import {
  GetTeamMetricsMaxSchema,
  GetTeamMetricsSchema,
} from '../schemas/sandboxes'

export const sandboxesRouter = createTRPCRouter({
  // QUERIES
  getSandboxes: protectedTeamProcedure.query(async ({ ctx }) => {
    const { session, teamId } = ctx

    if (USE_MOCK_DATA) {
      await new Promise((resolve) => setTimeout(resolve, 200))

      const sandboxes = MOCK_SANDBOXES_DATA()

      return {
        sandboxes,
      }
    }

    const sandboxesResponse = await infra.GET('/sandboxes', {
      headers: {
        ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
      },
      cache: 'no-store',
    })

    if (!sandboxesResponse.response.ok || sandboxesResponse.error) {
      const status = sandboxesResponse.response.status

      l.error(
        {
          key: 'trpc:sandboxes:get_team_sandboxes:infra_error',
          error: sandboxesResponse.error,
          team_id: teamId,
          user_id: session.user.id,
          context: {
            status,
          },
        },
        `failed to fetch /sandboxes: ${sandboxesResponse.error?.message || 'Unknown error'}`
      )

      throw apiError(status)
    }

    return {
      sandboxes: sandboxesResponse.data,
    }
  }),

  getSandboxesMetrics: protectedTeamProcedure
    .input(
      z.object({
        sandboxIds: z.array(z.string()),
      })
    )
    .query(async ({ ctx, input }) => {
      const { session, teamId } = ctx
      const { sandboxIds } = input

      if (sandboxIds.length === 0 || USE_MOCK_DATA) {
        return {
          metrics: {},
        }
      }

      const metricsResponse = await infra.GET('/sandboxes/metrics', {
        params: {
          query: {
            sandbox_ids: sandboxIds,
          },
        },
        headers: {
          ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
        },
        cache: 'no-store',
      })

      if (!metricsResponse.response.ok || metricsResponse.error) {
        const status = metricsResponse.response.status

        l.error(
          {
            key: 'trpc:sandboxes:get_team_sandboxes_metrics:infra_error',
            error: metricsResponse.error,
            team_id: teamId,
            user_id: session.user.id,
            context: {
              status,
              sandboxIds,
              path: '/sandboxes/metrics',
            },
          },
          `failed to fetch /sandboxes/metrics: ${metricsResponse.error?.message || 'Unknown error'}`
        )

        throw apiError(status)
      }

      const metrics = transformMetricsToClientMetrics(
        metricsResponse.data.sandboxes
      )

      return {
        metrics,
      }
    }),

  getTeamMetrics: protectedTeamProcedure
    .input(GetTeamMetricsSchema)
    .query(async ({ ctx, input }) => {
      const { session, teamId } = ctx
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

      const res = await infra.GET('/teams/{teamID}/metrics', {
        params: {
          path: {
            teamID: teamId,
          },
          query: {
            start: startS,
            end: endS + overfetchS,
          },
        },
        headers: {
          ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
        },
        cache: 'no-store',
      })

      if (!res.response.ok || res.error) {
        const status = res.response.status

        l.warn(
          {
            key: `trpc:sandboxes:get_team_metrics:infra_error`,
            error: res.error,
            team_id: teamId,
            user_id: session.user.id,
            context: {
              status,
              startMs: startDateMs,
              endMs: endDateMs,
              stepMs,
              overfetchS,
            },
          },
          `failed to fetch /teams/{teamID}/metrics: ${res.error?.message || 'Unknown error'}`
        )

        throw apiError(status)
      }

      // transform timestamps from seconds to milliseconds
      const metrics = res.data.map((d) => ({
        concurrentSandboxes: d.concurrentSandboxes,
        sandboxStartRate: d.sandboxStartRate,
        timestamp: d.timestampUnix * 1000,
      }))

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
      const { session, teamId } = ctx
      const { startDate: startDateMs, endDate: endDateMs, metric } = input

      if (USE_MOCK_DATA) {
        return MOCK_TEAM_METRICS_MAX_DATA(startDateMs, endDateMs, metric)
      }

      // convert milliseconds to seconds for the API
      const startS = Math.floor(startDateMs / 1000)
      const endS = Math.floor(endDateMs / 1000)

      const res = await infra.GET('/teams/{teamID}/metrics/max', {
        params: {
          path: {
            teamID: teamId,
          },
          query: {
            start: startS,
            end: endS,
            metric,
          },
        },
        headers: {
          ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
        },
        cache: 'no-store',
      })

      if (!res.response.ok || res.error) {
        const status = res.response.status

        l.error(
          {
            key: 'trpc:sandboxes:get_team_metrics_max:infra_error',
            error: res.error,
            team_id: teamId,
            user_id: session.user.id,
            context: {
              status,
              startDate: startDateMs,
              endDate: endDateMs,
              metric,
            },
          },
          `failed to fetch /teams/{teamID}/metrics/max: ${res.error?.message || 'Unknown error'}`
        )

        throw apiError(status)
      }

      // since javascript timestamps are in milliseconds, we want to convert the timestamp back to milliseconds
      const timestampMs = res.data.timestampUnix * 1000

      return {
        timestamp: timestampMs,
        value: res.data.value,
        metric,
      }
    }),

  // MUTATIONS
})
