import { COOKIE_KEYS } from '@/configs/keys'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { createClient } from '@/lib/clients/supabase/server'
import { encodedRedirect } from '@/lib/utils/auth'
import { getTeamMetadataFromCookiesMemo } from '@/lib/utils/server'
import getUserMemo from '@/server/auth/get-user-memo'
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const COOKIE_OPTIONS: Partial<ResponseCookie> = {
  path: '/dashboard/*',
  maxAge: 60 * 60 * 24 * 365, // 1 year
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
}

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

  l.debug(
    {
      key: 'dashboard_route:start',
      tab,
      url: request.url,
    },
    'dashboard route - start'
  )

  const supabase = await createClient()

  const { data, error } = await getUserMemo(supabase)

  l.debug(
    {
      key: 'dashboard_route:user_auth',
      hasUser: !!data?.user,
      userId: data?.user?.id,
      hasError: !!error,
    },
    'dashboard route - user auth'
  )

  if (error || !data.user) {
    l.debug(
      {
        key: 'dashboard_route:auth_redirect',
        redirectTo: '/sign-in',
      },
      'dashboard route - auth redirect'
    )
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  const metadata = await getTeamMetadataFromCookiesMemo(request.url)

  l.debug(
    {
      key: 'dashboard_route:team_metadata',
      hasMetadata: !!metadata,
      teamId: metadata?.id,
      teamSlug: metadata?.slug,
    },
    'dashboard route - team metadata'
  )

  const cookieStore = await cookies()

  let teamId = cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_ID)?.value
  let teamSlug = cookieStore.get(COOKIE_KEYS.SELECTED_TEAM_SLUG)?.value

  if (!metadata) {
    l.debug(
      {
        key: 'dashboard_route:cookies',
        teamId,
        teamSlug,
      },
      'dashboard route - reading team from cookies'
    )

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

    l.debug(
      {
        key: 'dashboard_route:teams_query',
        teamsCount: teamsData?.length ?? 0,
        userId: data.user.id,
      },
      'dashboard route - queried user teams'
    )

    if (!teamsData?.length) {
      l.debug(
        {
          key: 'dashboard_route:no_teams',
          redirectTo: PROTECTED_URLS.NEW_TEAM,
        },
        'dashboard route - no teams found, redirecting to new team'
      )

      // UNEXPECTED STATE - sign out and redirect to sign-in
      await supabase.auth.signOut()

      const signInUrl = new URL(AUTH_URLS.SIGN_IN, request.url)

      return encodedRedirect(
        'error',
        signInUrl.toString(),
        'No personal team found. Please contact support.'
      )
    }

    const defaultTeam = teamsData.find((t) => t.is_default) || teamsData[0]!
    teamId = defaultTeam.team_id
    teamSlug = defaultTeam.team?.slug || defaultTeam.team_id

    l.debug(
      {
        key: 'dashboard_route:default_team',
        teamId,
        teamSlug,
        isDefault: !!teamsData.find((t) => t.is_default),
      },
      'dashboard route - resolved default team'
    )
  }

  if (!teamSlug || !teamId) {
    l.debug(
      {
        key: 'dashboard_route:no_team_data',
        redirectTo: PROTECTED_URLS.DASHBOARD,
      },
      'dashboard route - no team data, redirecting to home'
    )
    return NextResponse.redirect(new URL('/', request.url))
  }

  cookieStore.set(COOKIE_KEYS.SELECTED_TEAM_ID, teamId, COOKIE_OPTIONS)
  cookieStore.set(COOKIE_KEYS.SELECTED_TEAM_SLUG, teamSlug, COOKIE_OPTIONS)

  const urlGenerator = tab ? TAB_URL_MAP[tab] : null
  const redirectPath = urlGenerator
    ? urlGenerator(teamSlug || teamId)
    : PROTECTED_URLS.SANDBOXES(teamSlug || teamId)

  l.debug(
    {
      key: 'dashboard_route:redirect',
      tab,
      redirectPath,
      teamIdentifier: teamSlug || teamId,
    },
    'dashboard route - redirecting to tab'
  )

  return NextResponse.redirect(new URL(redirectPath, request.url))
}
