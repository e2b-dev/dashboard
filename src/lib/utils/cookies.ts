import { COOKIE_KEYS, COOKIE_OPTIONS } from '@/configs/cookies'
import { cookies } from 'next/headers'

/**
 * Sets the team ID and slug cookies for the dashboard.
 * These cookies are used to persist the user's selected team across navigation.
 *
 * @param teamId - The team ID to store
 * @param teamSlug - The team slug to store
 */
export async function setTeamCookies(
  teamId: string,
  teamSlug: string
): Promise<void> {
  const cookieStore = await cookies()

  cookieStore.set(
    COOKIE_KEYS.SELECTED_TEAM_ID,
    teamId,
    COOKIE_OPTIONS[COOKIE_KEYS.SELECTED_TEAM_ID]
  )
  cookieStore.set(
    COOKIE_KEYS.SELECTED_TEAM_SLUG,
    teamSlug,
    COOKIE_OPTIONS[COOKIE_KEYS.SELECTED_TEAM_SLUG]
  )
}

/**
 * Retrieves the team ID and slug from cookies.
 *
 * @returns Object with teamId and teamSlug, or undefined if not set
 */
export async function getTeamCookies(): Promise<{
  teamId?: string
  teamSlug?: string
}> {
  const cookieStore = await cookies()

  return {
    teamId: cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_ID)?.value,
    teamSlug: cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_SLUG)?.value,
  }
}
