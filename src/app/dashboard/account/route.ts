import { type NextRequest, NextResponse } from 'next/server'
import { isOryAuthEnabled } from '@/configs/flags'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { auth } from '@/core/server/auth'
import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'
import { l } from '@/core/shared/clients/logger/logger'
import { encodedRedirect } from '@/lib/utils/auth'
import { setTeamCookies } from '@/lib/utils/cookies'

export async function GET(request: NextRequest) {
  const authContext = await auth.getAuthContext()

  if (!authContext) {
    return NextResponse.redirect(new URL(AUTH_URLS.SIGN_IN, request.url))
  }

  const team = await resolveUserTeam(
    authContext.user.id,
    authContext.accessToken
  )

  if (!team) {
    l.warn(
      {
        key: 'dashboard_account:no_personal_team',
        user_id: authContext.user.id,
      },
      'no personal team for user, signing out'
    )

    const { redirectTo } = await auth.signOut()

    if (!isOryAuthEnabled()) {
      const signInUrl = new URL(AUTH_URLS.SIGN_IN, request.url)

      return encodedRedirect(
        'error',
        signInUrl.toString(),
        'No personal team found. Please contact support.'
      )
    }

    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  await setTeamCookies(team.id, team.slug)

  const redirectPath = PROTECTED_URLS.RESOLVED_ACCOUNT_SETTINGS(team.slug)
  const redirectUrl = new URL(redirectPath, request.url)

  request.nextUrl.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value)
  })

  return NextResponse.redirect(redirectUrl)
}
