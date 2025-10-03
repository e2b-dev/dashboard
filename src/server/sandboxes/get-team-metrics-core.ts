import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { USE_MOCK_DATA } from '@/configs/flags'
import {
  calculateTeamMetricsStep,
  MOCK_TEAM_METRICS_DATA,
} from '@/configs/mock-data'
import { fillTeamMetricsWithZeros } from '@/features/dashboard/sandboxes/monitoring/utils'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { handleDefaultInfraError } from '@/lib/utils/action'
import { ClientTeamMetrics } from '@/types/sandboxes.types'
import { cache } from 'react'

interface GetTeamMetricsCoreParams {
  accessToken: string
  teamId: string
  userId: string
  startMs: number
  endMs: number
}

export type GetTeamMetricsCoreResult =
  | {
      data: {
        metrics: ClientTeamMetrics
        step: number
      }
      error?: undefined
      status?: undefined
    }
  | {
      data?: undefined
      error: string
      status: number
    }

/**
 * Core team metrics fetching logic shared between server action and route handler.
 * Handles fetching, transformation, and zero-filling of metrics data.
 *
 * Memoized at the request level using React cache - multiple server components
 * calling this with the same parameters during SSR will share the result.
 */
export const getTeamMetricsCore = cache(
  async ({
    accessToken,
    teamId,
    userId,
    startMs,
    endMs,
  }: GetTeamMetricsCoreParams): Promise<GetTeamMetricsCoreResult> => {
    // use mock data if enabled
    if (USE_MOCK_DATA) {
      const mockData = MOCK_TEAM_METRICS_DATA(startMs, endMs)
      const filledMetrics = fillTeamMetricsWithZeros(
        mockData.metrics,
        startMs,
        endMs,
        mockData.step
      )
      return {
        data: {
          metrics: filledMetrics,
          step: mockData.step,
        },
      }
    }

    const startS = Math.floor(startMs / 1000)
    const endS = Math.floor(endMs / 1000)

    // calculate step to determine overfetch amount
    const stepMs = calculateTeamMetricsStep(startMs, endMs)

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
        ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
      },
      cache: 'no-store',
    })

    if (res.error) {
      const status = res.response.status

      l.error(
        {
          key: `get_team_metrics_core:infra_error`,
          error: res.error,
          team_id: teamId,
          user_id: userId,
          context: {
            status,
            startMs,
            endMs,
            stepMs,
            overfetchS,
          },
        },
        `get_team_metrics_core: failed to fetch team metrics: ${res.error.message}`
      )

      return {
        error: handleDefaultInfraError(status),
        status,
      }
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
      startMs,
      endMs,
      stepMs
    )

    l.info(
      {
        key: `get_team_metrics_core:success`,
        team_id: teamId,
        user_id: userId,
        context: {
          requestedRangeMs: { startMs, endMs },
          rawDataPoints: metrics.length,
          filledDataPoints: filledMetrics.length,
          stepMs,
          overfetchSeconds: overfetchS,
        },
      },
      'get_team_metrics_core: successfully fetched and processed team metrics'
    )

    return {
      data: {
        metrics: filledMetrics,
        step: stepMs,
      },
    }
  }
)
