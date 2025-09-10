import 'server-cli-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { infra } from '@/lib/clients/api'
import { cache } from 'react'

/**
 * Memoized function to fetch team metrics from the infra API.
 * This is cached at the request level using React cache().
 *
 * All server components in the same request tree that call this
 * with the same parameters will get the same result without
 * making duplicate API calls.
 *
 * @param accessToken - The user's access token for authentication
 * @param teamId - The team ID to fetch metrics for
 * @param startDate - Start date in seconds (unix timestamp)
 * @param endDate - End date in seconds (unix timestamp)
 * @returns The raw API response from the infra service
 *
 * @example
 * // In a server component
 * const res = await getTeamMetricsMemoized(
 *   session.access_token,
 *   teamId,
 *   startSeconds,
 *   endSeconds
 * )
 */
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

export default getTeamMetricsMemoized
