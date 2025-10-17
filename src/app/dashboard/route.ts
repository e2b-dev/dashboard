import { COOKIE_KEYS } from '@/configs/keys'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { createClient } from '@/lib/clients/supabase/server'
import { encodedRedirect } from '@/lib/utils/auth'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const TAB_URL_MAP: Record<string, (teamId: string) => string> = {
  sandboxes: (teamId) => PROTECTED_URLS.SANDBOXES(teamId),
  templates: (teamId) => PROTECTED_URLS.TEMPLATES(teamId),
  usage: (teamId) => PROTECTED_URLS.USAGE(teamId),
  billing: (teamId) => PROTECTED_URLS.BILLING(teamId),
  budget: (teamId) => PROTECTED_URLS.BUDGET(teamId),
  keys: (teamId) => PROTECTED_URLS.SETTINGS(teamId, 'keys'),
  settings: (teamId) => PROTECTED_URLS.SETTINGS(teamId, 'general'),
  team: (teamId) => PROTECTED_URLS.SETTINGS(teamId, 'general'),
  members: (teamId) => PROTECTED_URLS.MEMBERS(teamId),
  account: (_) => PROTECTED_URLS.ACCOUNT_SETTINGS,
  personal: (_) => PROTECTED_URLS.ACCOUNT_SETTINGS,
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const tab = searchParams.get('tab')

  if (!tab || !TAB_URL_MAP[tab]) {
    // default to dashboard if no valid tab
    return NextResponse.redirect(new URL(PROTECTED_URLS.DASHBOARD, request.url))
  }

  // get the user
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    // redirect to sign-in if not authenticated
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }
  const cookieStore = await cookies()

  // resolve team ID (first try cookie, then fetch default)
  let teamId = cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_ID)?.value
  let teamSlug = cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_SLUG)?.value

  if (!teamId) {
    // no team in cookie, fetch user's default team
    const { data: teamsData } = await supabaseAdmin
      .from('users_teams')
      .select(
        `
        team_id,
        is_default,
        team:teams(*)
      `
      )
      .eq('user_id', data.user.id)

    if (!teamsData?.length) {
      // UNEXPECTED STATE - sign out and redirect to sign-in
      await supabase.auth.signOut()

      const signInUrl = new URL(AUTH_URLS.SIGN_IN, request.url)

      return encodedRedirect(
        'error',
        signInUrl.toString(),
        'No personal team found. Please contact support.'
      )
    }

    // use default team or first team
    const defaultTeam = teamsData.find((t) => t.is_default) || teamsData[0]!
    teamId = defaultTeam.team_id
    teamSlug = defaultTeam.team?.slug || defaultTeam.team_id
  }

  // build the redirect URL using the tab mapping
  const urlGenerator = TAB_URL_MAP[tab]
  const redirectPath = urlGenerator(teamSlug || teamId)

  // redirect to the appropriate dashboard section
  return NextResponse.redirect(new URL(redirectPath, request.url))
}
