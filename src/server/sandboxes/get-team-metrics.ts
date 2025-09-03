import 'server-only'

import { TeamMetricsRequestSchema } from '@/app/api/teams/[teamId]/metrics/types'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { USE_MOCK_DATA } from '@/configs/flags'
import {
  calculateTeamMetricsStep,
  MOCK_TEAM_METRICS_DATA,
} from '@/configs/mock-data'
import { authActionClient } from '@/lib/clients/action'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { handleDefaultInfraError } from '@/lib/utils/action'
import { fillTeamMetricsWithZeros } from '@/lib/utils/sandboxes'
import { ClientTeamMetrics } from '@/types/sandboxes.types'

import { cache } from 'react'
import { z } from 'zod'

// metadata about the overfetch operation
export interface OverfetchMetadata {
  requestedStart: number
  requestedEnd: number
  actualFetchStart: number
  actualFetchEnd: number
  hasDataInBuffer: boolean
  lastDataPoint: number | null
  bufferDataPoints: number
  confidence: 'high' | 'medium' | 'low'
}

// enhanced response with overfetch metadata
export interface TeamMetricsWithOverfetch {
  metrics: ClientTeamMetrics
  step: number
  overfetchMetadata: OverfetchMetadata
}

export const GetTeamMetricsSchema = z
  .object({
    teamId: z.string().uuid(),
    startDate: TeamMetricsRequestSchema._def.schema.shape.start,
    endDate: TeamMetricsRequestSchema._def.schema.shape.end,
  })
  .refine(
    (data) => {
      const maxSpanMs = 35 * 24 * 60 * 60 * 1000 // 35 days in ms
      return data.endDate - data.startDate <= maxSpanMs
    },
    { message: 'Date range cannot exceed 35 days' }
  )

/**
 * Calculate the overfetch buffer size based on the request parameters
 * Returns additional milliseconds to fetch beyond the requested end time
 */
function calculateOverfetchBuffer(
  startMs: number,
  endMs: number,
  estimatedStep: number = 60000 // default 1 minute if unknown
): number {
  const rangeMs = endMs - startMs

  // calculate buffer as maximum of:
  // - 3x the estimated step (at least 3 data points)
  // - 5 minutes (to account for processing delays)
  // - 10% of the total range (proportional to query size)
  const bufferMs = Math.max(
    estimatedStep * 3,
    5 * 60 * 1000, // 5 minutes
    rangeMs * 0.1 // 10% of range
  )

  // cap buffer at 1 hour to avoid excessive overfetching
  return Math.min(bufferMs, 60 * 60 * 1000)
}

/**
 * Determine confidence level for zero-filling based on overfetch results
 */
function determineConfidence(
  hasDataInBuffer: boolean,
  lastDataPoint: number | null,
  requestedEnd: number,
  step: number
): 'high' | 'medium' | 'low' {
  if (hasDataInBuffer) {
    // data exists beyond requested range, high confidence in no zeros
    return 'high'
  }

  if (!lastDataPoint) {
    // no data at all, low confidence
    return 'low'
  }

  const gapToEnd = requestedEnd - lastDataPoint

  if (gapToEnd > step * 10 || gapToEnd > 15 * 60 * 1000) {
    // large gap, high confidence zeros are real
    return 'high'
  }

  if (gapToEnd > step * 3) {
    // moderate gap
    return 'medium'
  }

  // small gap, low confidence
  return 'low'
}

/**
 * Fetch team metrics with intelligent overfetching to avoid false zeros
 * This is the main abstraction that handles overfetch logic
 */
export async function fetchTeamMetricsWithOverfetch(
  accessToken: string,
  teamId: string,
  startDateMs: number,
  endDateMs: number
): Promise<TeamMetricsWithOverfetch> {
  // estimate step based on time range
  const estimatedStep = calculateTeamMetricsStep(startDateMs, endDateMs)

  // calculate overfetch buffer
  const bufferMs = calculateOverfetchBuffer(
    startDateMs,
    endDateMs,
    estimatedStep
  )
  const overfetchEndMs = endDateMs + bufferMs

  // convert to seconds for API
  const startSeconds = Math.floor(startDateMs / 1000)
  const overfetchEndSeconds = Math.floor(overfetchEndMs / 1000)

  l.info(
    {
      key: 'team_metrics:overfetch',
      team_id: teamId,
      requested: { start: startDateMs, end: endDateMs },
      actual: { start: startDateMs, end: overfetchEndMs },
      buffer_ms: bufferMs,
    },
    'Overfetching team metrics'
  )

  const res = await getTeamMetricsMemoized(
    accessToken,
    teamId,
    startSeconds,
    overfetchEndSeconds
  )

  if (res.error) {
    throw res.error
  }

  // process all fetched data
  const allData = res.data.map((d) => ({
    ...d,
    timestamp: new Date(d.timestamp).getTime(),
  }))

  // calculate actual step from data
  const step =
    allData[1]?.timestamp && allData[0]?.timestamp
      ? allData[1]?.timestamp - allData[0]?.timestamp
      : estimatedStep

  // separate data into requested range and buffer
  const requestedData = allData.filter(
    (d) => d.timestamp >= startDateMs && d.timestamp <= endDateMs
  )
  const bufferData = allData.filter((d) => d.timestamp > endDateMs)

  // find last actual data point
  const lastDataPoint =
    allData.length > 0 ? Math.max(...allData.map((d) => d.timestamp)) : null

  // determine confidence level
  const confidence = determineConfidence(
    bufferData.length > 0,
    lastDataPoint,
    endDateMs,
    step
  )

  // create metadata
  const overfetchMetadata: OverfetchMetadata = {
    requestedStart: startDateMs,
    requestedEnd: endDateMs,
    actualFetchStart: startDateMs,
    actualFetchEnd: overfetchEndMs,
    hasDataInBuffer: bufferData.length > 0,
    lastDataPoint,
    bufferDataPoints: bufferData.length,
    confidence,
  }

  // intelligently fill zeros based on metadata
  const filledData = fillTeamMetricsWithZeros(
    requestedData,
    startDateMs,
    endDateMs,
    step,
    0.1, // anomalous gap tolerance
    overfetchMetadata // pass metadata for intelligent decisions
  )

  return {
    metrics: filledData,
    step,
    overfetchMetadata,
  }
}

export const getTeamMetrics = authActionClient
  .schema(GetTeamMetricsSchema)
  .metadata({ serverFunctionName: 'getTeamMetrics' })
  .action(async ({ parsedInput, ctx }) => {
    const { session } = ctx

    const teamId = parsedInput.teamId
    const { startDate: startDateMs, endDate: endDateMs } = parsedInput

    if (USE_MOCK_DATA) {
      return MOCK_TEAM_METRICS_DATA(startDateMs, endDateMs)
    }

    try {
      const result = await fetchTeamMetricsWithOverfetch(
        session.access_token,
        teamId,
        startDateMs,
        endDateMs
      )

      // for backwards compatibility, return the standard format
      // but log the overfetch metadata for monitoring
      l.info(
        {
          key: 'team_metrics:result',
          team_id: teamId,
          user_id: session.user.id,
          overfetch_metadata: result.overfetchMetadata,
        },
        'Team metrics fetched with overfetch'
      )

      return {
        metrics: result.metrics,
        step: result.step,
      }
    } catch (error) {
      const status = error instanceof Response ? error.status : 500

      l.error(
        {
          key: 'get_team_metrics:infra_error',
          error: error,
          team_id: teamId,
          user_id: session.user.id,
          context: {
            status,
            startDate: startDateMs,
            endDate: endDateMs,
          },
        },
        `Failed to get team metrics: ${error instanceof Error ? error.message : 'Unknown error'}`
      )

      return handleDefaultInfraError(status)
    }
  })

const getTeamMetricsMemoized = cache(
  async (
    accessToken: string,
    teamId: string,
    startDate: number,
    endDate: number
  ) => {
    return await infra.GET('/teams/{teamID}/metrics', {
      params: {
        path: {
          teamID: teamId,
        },
        query: {
          start: startDate,
          end: endDate,
        },
      },
      headers: {
        ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
      },
      cache: 'no-store',
    })
  }
)
