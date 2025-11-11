import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { COOKIE_KEYS } from '@/configs/cookies'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { z } from 'zod'
import { infra } from '../clients/api'
import { l } from '../clients/logger/logger'
import { returnServerError } from './action'

/*
 *  This function generates an e2b user access token for a given user.
 */
export async function generateE2BUserAccessToken(supabaseAccessToken: string) {
  const TOKEN_NAME = 'e2b_dashboard_generated_access_token'

  const res = await infra.POST('/access-tokens', {
    body: {
      name: TOKEN_NAME,
    },
    headers: {
      ...SUPABASE_AUTH_HEADERS(supabaseAccessToken),
    },
  })

  if (res.error) {
    l.error(
      {
        key: 'GENERATE_E2B_USER_ACCESS_TOKEN:INFRA_ERROR',
        message: res.error.message,
        error: res.error,
        context: {
          status: res.response.status,
          method: 'POST',
          path: '/access-tokens',
          name: TOKEN_NAME,
        },
      },
      'Failed to generate e2b user access token'
    )

    return returnServerError(`Failed to generate e2b user access token`)
  }

  return res.data
}

export const getTeamMetadataFromCookies = async (teamIdOrSlug: string) => {
  const cookiesStore = await cookies()

  const cookieTeamId = cookiesStore.get(COOKIE_KEYS.SELECTED_TEAM_ID)?.value
  const cookieTeamSlug = cookiesStore.get(COOKIE_KEYS.SELECTED_TEAM_SLUG)?.value

  if (!cookieTeamId || !cookieTeamSlug) {
    return null
  }

  const isSensical =
    cookieTeamId === teamIdOrSlug || cookieTeamSlug === teamIdOrSlug
  const isUUID = z.uuid().safeParse(cookieTeamId).success

  if (isUUID && isSensical) {
    return {
      id: cookieTeamId,
      slug: cookieTeamSlug,
    }
  }

  return null
}

/**
 * Returns a consistent "now" timestamp for the entire request.
 * Memoized using React cache() to ensure all server components
 * in the same request tree get the exact same timestamp.
 *
 * The timestamp is rounded to the nearest 5 seconds for better cache alignment
 * and to reduce cache fragmentation.
 */
export const getNowMemo = cache(() => {
  const now = Date.now()
  // round to nearest 5 seconds for better cache alignment
  return Math.floor(now / 5000) * 5000
})
