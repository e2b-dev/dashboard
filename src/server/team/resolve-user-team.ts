import 'server-only'

import { COOKIE_KEYS } from '@/configs/cookies'
import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { cookies } from 'next/headers'
import { serializeError } from 'serialize-error'
import checkUserTeamAuth from '../auth/check-user-team-auth'
import { ResolvedTeam } from './types'

/**
 * Resolves team ID and slug for a user using this priority:
 * 1. Cookie values (if exist and user is authorized)
 * 2. Database default team
 * 3. Database first team
 *
 * This function centralizes all team resolution logic used across route handlers.
 *
 * @param userId - The user ID to resolve team for
 * @returns ResolvedTeam with team ID and slug, or null if no team found
 */
export async function resolveUserTeam(
  userId: string
): Promise<ResolvedTeam | null> {
  const cookieStore = await cookies()

  // Try to get team from cookies first
  const cookieTeamId = cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_ID)?.value
  const cookieTeamSlug = cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_SLUG)?.value

  // If we have cookies, check if the user is authorized to access the team
  if (cookieTeamId && cookieTeamSlug) {
    const isAuthorized = await checkUserTeamAuth(userId, cookieTeamId)

    if (isAuthorized) {
      return {
        id: cookieTeamId,
        slug: cookieTeamSlug,
      }
    }
  }

  // No valid cookies, query database for user's teams
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
    }
  }

  // Fallback to first team
  const firstTeam = teamsData[0]!

  if (firstTeam?.team) {
    return {
      id: firstTeam.team_id,
      slug: firstTeam.team.slug || firstTeam.team_id,
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
