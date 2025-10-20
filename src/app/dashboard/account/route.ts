import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { l } from '@/lib/clients/logger/logger'
import { createClient } from '@/lib/clients/supabase/server'
import { encodedRedirect } from '@/lib/utils/auth'
import { setTeamCookies } from '@/lib/utils/cookies'
import { resolveUserTeam } from '@/server/team/resolve-user-team'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  l.debug(
    {
      key: 'account_route:start',
      url: request.url,
    },
    'account route - start'
  )

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  l.debug(
    {
      key: 'account_route:user_auth',
      hasUser: !!data?.user,
      userId: data?.user?.id,
      hasError: !!error,
    },
    'account route - user auth'
  )

  if (error || !data.user) {
    l.debug(
      {
        key: 'account_route:auth_redirect',
        redirectTo: '/sign-in',
      },
      'account route - auth redirect'
    )
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  // Resolve team for the user
  const team = await resolveUserTeam(data.user.id)

  if (!team) {
    l.debug(
      {
        key: 'account_route:no_teams',
        userId: data.user.id,
      },
      'account route - no teams found, redirecting to sign-in'
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
      key: 'account_route:team_resolved',
      teamId: team.id,
      teamSlug: team.slug,
      source: team.source,
    },
    'account route - team resolved'
  )

  // Set team cookies for persistence
  await setTeamCookies(team.id, team.slug)

  // Build redirect URL with team
  const redirectPath = PROTECTED_URLS.RESOLVED_ACCOUNT_SETTINGS(
    team.slug || team.id
  )
  const redirectUrl = new URL(redirectPath, request.url)

  // Preserve query parameters (e.g., reauth=1)
  request.nextUrl.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value)
  })

  l.debug(
    {
      key: 'account_route:redirect',
      redirectPath: redirectUrl.toString(),
      teamIdentifier: team.slug || team.id,
    },
    'account route - redirecting to account settings'
  )

  return NextResponse.redirect(redirectUrl)
}
