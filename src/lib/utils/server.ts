import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { CACHE_TAGS } from '@/configs/cache'
import { COOKIE_KEYS } from '@/configs/cookies'
import { KV_KEYS } from '@/configs/keys'
import { kv } from '@/lib/clients/kv'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { getTeamIdFromSegment } from '@/server/team/get-team-id-from-segment'
import { E2BError } from '@/types/errors'
import { unstable_cacheLife, unstable_cacheTag } from 'next/cache'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { serializeError } from 'serialize-error'
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

// TODO: we should probably add some team permission system here

/*
 *  This function checks if a user is authorized to access a team.
 *  If the user is not authorized, it returns false.
 */
export async function checkUserTeamAuthorization(
  userId: string,
  teamIdOrSlug: string
) {
  'use cache'
  unstable_cacheLife('minutes')
  unstable_cacheTag(CACHE_TAGS.USER_TEAM_AUTHORIZATION(userId, teamIdOrSlug))

  const teamId = await getTeamIdFromSegment(teamIdOrSlug)

  if (!teamId) {
    return null
  }

  const { data: userTeamsRelationData, error: userTeamsRelationError } =
    await supabaseAdmin
      .from('users_teams')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', teamId)

  if (userTeamsRelationError) {
    l.error(
      {
        key: 'check_user_team_authorization:failed_to_fetch_users_teams_relation',
        error: serializeError(userTeamsRelationError),
        context: {
          userId,
          teamId,
        },
      },
      `Failed to fetch users_teams relation (user: ${userId}, team: ${teamId})`
    )

    return null
  }

  return !!userTeamsRelationData.length
}

/**
 * Resolves a team identifier (UUID or slug) to a team ID.
 * If the input is a valid UUID, returns it directly.
 * If it's a slug, attempts to resolve it to an ID using Redis cache first, then database.
 *
 * @param identifier - Team UUID or slug
 * @returns Promise<string> - Resolved team ID
 * @throws E2BError if team not found or identifier invalid
 */
export async function resolveTeamId(identifier: string): Promise<string> {
  // If identifier is UUID, return directly
  if (z.uuid().safeParse(identifier).success) {
    return identifier
  }

  // Try to get from cache first
  const cacheKey = KV_KEYS.TEAM_SLUG_TO_ID(identifier)
  const cachedId = await kv.get<string>(cacheKey)

  if (cachedId) return cachedId

  // Not in cache or invalid cache, query database
  const { data: team, error } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('slug', identifier)
    .single()

  if (error || !team) {
    l.error(
      {
        key: 'resolve_team_id:failed_to_resolve_team_id_from_slug',
        message: error.message,
        error: serializeError(error),
        context: {
          identifier,
        },
      },
      'Failed to resolve team ID from slug'
    )

    throw new E2BError('INVALID_PARAMETERS', 'Invalid team identifier')
  }
  // Cache the result
  await Promise.all([
    kv.set(cacheKey, team.id, { ex: 60 * 60 }), // 1 hour
    kv.set(KV_KEYS.TEAM_ID_TO_SLUG(team.id), identifier, { ex: 60 * 60 }),
  ])

  return team.id
}

/**
 * Resolves team metadata from cookies.
 * If no metadata is found, it redirects to the dashboard.
 */
export const getTeamMetadataFromCookiesCache = cache(
  async (
    teamIdOrSlug: string,
    cookieTeamId: string,
    cookieTeamSlug: string
  ) => {
    const isSensical =
      cookieTeamId === teamIdOrSlug || cookieTeamSlug === teamIdOrSlug
    const isUUID = z.uuid().safeParse(cookieTeamId).success

    l.debug(
      {
        key: 'get_team_metadata_from_cookies:validation',
        teamIdOrSlug,
        cookieTeamId,
        cookieTeamSlug,
        isSensical,
        isUUID,
      },
      'validating team metadata'
    )

    if (isUUID && isSensical) {
      l.debug(
        {
          key: 'get_team_metadata_from_cookies:success',
          teamIdOrSlug,
          cookieTeamId,
          cookieTeamSlug,
        },
        'successfully resolved team metadata from cookies'
      )
      return {
        id: cookieTeamId,
        slug: cookieTeamSlug,
      }
    }

    l.debug(
      {
        key: 'get_team_metadata_from_cookies:invalid_data',
        teamIdOrSlug,
        cookieTeamId,
        cookieTeamSlug,
        isSensical,
        isUUID,
      },
      'invalid team data, returning null'
    )
    return null
  }
)

export const getTeamMetadataFromCookiesMemo = async (teamIdOrSlug: string) => {
  const cookiesStore = await cookies()

  l.debug(
    {
      key: 'get_team_metadata_from_cookies:start',
      cookiesStore: cookiesStore.getAll(),
    },
    'resolving team metadata from cookies'
  )

  const cookieTeamId = cookiesStore.get(COOKIE_KEYS.SELECTED_TEAM_ID)?.value
  const cookieTeamSlug = cookiesStore.get(COOKIE_KEYS.SELECTED_TEAM_SLUG)?.value

  l.debug(
    {
      key: 'get_team_metadata_from_cookies:start',
      hasId: !!cookieTeamId,
      hasSlug: !!cookieTeamSlug,
      cookieTeamId,
      cookieTeamSlug,
    },
    'resolving team metadata from cookies'
  )

  if (!cookieTeamId || !cookieTeamSlug) {
    l.debug(
      {
        key: 'get_team_metadata_from_cookies:missing_data',
        hasId: !!cookieTeamId,
        hasSlug: !!cookieTeamSlug,
      },
      'missing team data in cookies, returning null'
    )
    return null
  }

  return getTeamMetadataFromCookiesCache(
    teamIdOrSlug,
    cookieTeamId,
    cookieTeamSlug
  )
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
