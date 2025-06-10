import { NextRequest, NextResponse } from 'next/server'
import { PROTECTED_URLS } from '@/configs/urls'
import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/configs/keys'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { createRouteClient } from '@/lib/clients/supabase/server'

const TAB_URL_MAP: Record<string, (teamId: string) => string> = {
  sandboxes: (teamId) => PROTECTED_URLS.SANDBOXES(teamId),
  templates: (teamId) => PROTECTED_URLS.TEMPLATES(teamId),
  usage: (teamId) => PROTECTED_URLS.USAGE(teamId),
  billing: (teamId) => PROTECTED_URLS.BILLING(teamId),
  budget: (teamId) => PROTECTED_URLS.BUDGET(teamId),
  keys: (teamId) => PROTECTED_URLS.KEYS(teamId),
  team: (teamId) => PROTECTED_URLS.TEAM(teamId),
  account: (_) => PROTECTED_URLS.ACCOUNT_SETTINGS,
  personal: (_) => PROTECTED_URLS.ACCOUNT_SETTINGS,
}

export async function GET(request: NextRequest) {
  // 1. Get the tab parameter
  const searchParams = request.nextUrl.searchParams
  const tab = searchParams.get('tab')

  if (!tab || !TAB_URL_MAP[tab]) {
    // Default to dashboard if no valid tab
    return NextResponse.redirect(new URL(PROTECTED_URLS.DASHBOARD, request.url))
  }

  // 2. Create Supabase client and get user
  const supabase = createRouteClient(request)

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    // Redirect to sign-in if not authenticated
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }
  const cookieStore = await cookies()

  // 3. Resolve team ID (first try cookie, then fetch default)
  let teamId = cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_ID)?.value
  let teamSlug = cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_SLUG)?.value

  if (!teamId) {
    // No team in cookie, fetch user's default team
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
      // No teams, redirect to new team creation
      return NextResponse.redirect(
        new URL(PROTECTED_URLS.NEW_TEAM, request.url)
      )
    }

    // Use default team or first team
    const defaultTeam = teamsData.find((t) => t.is_default) || teamsData[0]!
    teamId = defaultTeam.team_id
    teamSlug = defaultTeam.team?.slug || defaultTeam.team_id
  }

  // 4. Build the redirect URL using the tab mapping
  const urlGenerator = TAB_URL_MAP[tab]
  const redirectPath = urlGenerator(teamSlug || teamId)

  // 5. Redirect to the appropriate dashboard section
  return NextResponse.redirect(new URL(redirectPath, request.url))
}
