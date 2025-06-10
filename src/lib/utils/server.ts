import 'server-cli-only'

import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { createClient } from '@/lib/clients/supabase/server'
import { E2BError, UnauthenticatedError } from '@/types/errors'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { unstable_noStore } from 'next/cache'
import { COOKIE_KEYS } from '@/configs/keys'
import { logError, logger } from '../clients/logger'
import { kv } from '@/lib/clients/kv'
import { KV_KEYS } from '@/configs/keys'
import { ERROR_CODES, INFO_CODES } from '@/configs/logs'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { CreatedAccessToken } from '@/types/api'
import { infra } from '../clients/api'
import { returnServerError } from './action'

/*
 *  This function checks if the user is authenticated and returns the user and the supabase client.
 *  If the user is not authenticated, it throws an error.
 *
 *  @params request - an optional NextRequest object to create a supabase client for route handlers
 */
export async function checkAuthenticated() {
  const supabase = await createClient()

  // retrieve session from storage medium (cookies)
  // if no stored session found, not authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw UnauthenticatedError()
  }

  // now retrieve user from supabase to use further
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw UnauthenticatedError()
  }

  return { user, session, supabase }
}

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
    logError(ERROR_CODES.INFRA, '/access-tokens', res.error, res.data)

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
  teamId: string
) {
  if (
    !z.string().uuid().safeParse(userId).success ||
    !z.string().uuid().safeParse(teamId).success
  ) {
    return false
  }

  const { data: userTeamsRelationData, error: userTeamsRelationError } =
    await supabaseAdmin
      .from('users_teams')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', teamId)

  if (userTeamsRelationError) {
    throw new Error(
      `Failed to fetch users_teams relation (user: ${userId}, team: ${teamId})`
    )
  }

  return !!userTeamsRelationData.length
}

/**
 * Forces a component to be dynamically rendered at runtime.
 * This opts out of Partial Prerendering (PPR) for the component and its children.
 *
 * Use this when you need to ensure a component is rendered at request time,
 * for example when dealing with user authentication or dynamic data that
 * must be fresh on every request.
 *
 * IMPORTANT: When used in PPR scopes, this must be called before any try-catch blocks
 * to properly opt out of static optimization. Placing it inside try-catch blocks
 * may result in unexpected behavior.
 *
 * @example
 * // Correct usage - before try-catch
 * bailOutFromPPR();
 * try {
 *   // dynamic code
 * } catch (e) {}
 *
 * @see https://nextjs.org/docs/app/api-reference/functions/cookies
 */
export function bailOutFromPPR() {
  unstable_noStore()
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
  if (z.string().uuid().safeParse(identifier).success) {
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
    logger.error(
      {
        code: ERROR_CODES.SELECTED_TEAM_RESOLUTION,
        identifier,
        error,
      },
      `Failed to resolve team ID from slug: ${identifier}`
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
 * Resolves a team identifier (UUID or slug) to a team ID.
 * If the input is a valid UUID, returns it directly.
 * If it's a slug, attempts to resolve it to an ID using Redis cache first, then database.
 *
 * This function should be used in page components rather than client components for better performance,
 * as it avoids unnecessary database queries by checking cookies first.
 *
 * @param identifier - Team UUID or slug
 * @returns Promise<string> - Resolved team ID
 */
export async function resolveTeamIdInServerComponent(identifier: string) {
  const cookiesStore = await cookies()

  let teamId = cookiesStore.get(COOKIE_KEYS.SELECTED_TEAM_ID)?.value

  if (!teamId) {
    // Middleware should prevent this case, but just in case
    teamId = await resolveTeamId(identifier)
    cookiesStore.set(COOKIE_KEYS.SELECTED_TEAM_ID, teamId)

    logger.info(
      INFO_CODES.EXPENSIVE_OPERATION,
      'Resolving teamId resolution in server component from data sources',
      {
        identifier,
        teamId,
      }
    )
  }
  return teamId
}

/**
 * Resolves a team slug from cookies.
 * If no slug is found, it returns null.
 *
 *
 */
export async function resolveTeamSlugInServerComponent() {
  const cookiesStore = await cookies()

  return cookiesStore.get(COOKIE_KEYS.SELECTED_TEAM_SLUG)?.value
}
