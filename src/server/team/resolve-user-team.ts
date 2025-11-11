import 'server-cli-only'

import { COOKIE_KEYS } from '@/configs/cookies'
import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { getTeamMetadataFromCookies } from '@/lib/utils/server'
import { cookies } from 'next/headers'
import { serializeError } from 'serialize-error'
import { ResolvedTeam } from './types'

/**
 * Resolves team ID and slug for a user using this priority:
 * 1. Cookie metadata (if valid for current URL segment)
 * 2. Cookie values (if exist and match URL)
 * 3. Database default team
 * 4. Database first team
 *
 * This function centralizes all team resolution logic used across route handlers.
 *
 * @param userId - The user ID to resolve team for
 * @param urlSegment - Optional URL segment to validate cookie metadata against
 * @returns ResolvedTeam with team ID, slug, and resolution source, or null if no team found
 */
export async function resolveUserTeam(
  userId: string,
  urlSegment?: string
): Promise<ResolvedTeam | null> {
  const cookieStore = await cookies()

  // Try to get team from cookies first
  const cookieTeamId = cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_ID)?.value
  const cookieTeamSlug = cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_SLUG)?.value

  // If we have a URL segment, try to validate against cookie metadata
  if (urlSegment) {
    const metadata = await getTeamMetadataFromCookies(urlSegment)

    if (metadata) {
      return {
        id: metadata.id,
        slug: metadata.slug,
        source: 'url-cookies',
      }
    }
  }

  // If we have cookies but no valid URL match, still use them if available
  if (cookieTeamId && cookieTeamSlug) {
    return {
      id: cookieTeamId,
      slug: cookieTeamSlug,
      source: 'cookies',
    }
  }

  // No valid cookies, query database
  const { data: teamsData, error } = await supabaseAdmin
    .from('users_teams')
    .select(
      `
      team_id,
      is_default,
      team:teams(
        id,
        slug
      )
    `
    )
    .eq('user_id', userId)

  if (error) {
    l.error(
      {
        key: 'resolve_user_team:db_error',
        userId,
        error: serializeError(error),
      },
      'Failed to query user teams'
    )
    return null
  }

  if (!teamsData || teamsData.length === 0) {
    return null
  }

  // Try to get default team first
  const defaultTeam = teamsData.find((t) => t.is_default)

  if (defaultTeam?.team) {
    return {
      id: defaultTeam.team_id,
      slug: defaultTeam.team.slug || defaultTeam.team_id,
      source: 'default-db',
    }
  }

  // Fallback to first team
  const firstTeam = teamsData[0]!

  if (firstTeam?.team) {
    return {
      id: firstTeam.team_id,
      slug: firstTeam.team.slug || firstTeam.team_id,
      source: 'first-db',
    }
  }

  l.error(
    {
      key: 'resolve_user_team:malformed_data',
      userId,
      teamsData,
    },
    'Teams data exists but malformed (no team relation)'
  )

  return null
}
