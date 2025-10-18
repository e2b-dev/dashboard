import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { l } from '@/lib/clients/logger/logger'
import { createClient } from '@/lib/clients/supabase/server'
import { encodedRedirect } from '@/lib/utils/auth'
import { setTeamCookies } from '@/lib/utils/cookies'
import { resolveUserTeam } from '@/server/team/resolve-user-team'
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

  l.debug(
    {
      key: 'dashboard_route:start',
      tab,
      url: request.url,
    },
    'dashboard route - start'
  )

  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()

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

  const team = await resolveUserTeam(data.user.id)

  if (!team) {
    l.debug(
      {
        key: 'dashboard_route:no_teams',
        userId: data.user.id,
      },
      'dashboard route - no teams found, redirecting to sign-in'
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

  l.debug(
    {
      key: 'dashboard_route:team_resolved',
      teamId: team.id,
      teamSlug: team.slug,
      source: team.source,
    },
    'dashboard route - team resolved'
  )

  // Set team cookies for persistence
  await setTeamCookies(team.id, team.slug)

  // Determine redirect path based on tab parameter
  const urlGenerator = tab ? TAB_URL_MAP[tab] : null
  const redirectPath = urlGenerator
    ? urlGenerator(team.slug || team.id)
    : PROTECTED_URLS.SANDBOXES(team.slug || team.id)

  l.debug(
    {
      key: 'dashboard_route:redirect',
      tab,
      redirectPath,
      teamIdentifier: team.slug || team.id,
    },
    'dashboard route - redirecting to tab'
  )

  return NextResponse.redirect(new URL(redirectPath, request.url))
}
