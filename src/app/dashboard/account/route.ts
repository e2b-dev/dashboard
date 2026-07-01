import { type NextRequest, NextResponse } from 'next/server'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { getAuthContext, signOut } from '@/core/server/auth'
import { resolvePublicOrigin } from '@/core/server/auth/ory/oauth-relay'
import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'
import { l } from '@/core/shared/clients/logger/logger'
import { setTeamCookies } from '@/lib/utils/cookies'

export async function GET(request: NextRequest) {
  const origin = resolvePublicOrigin(request.nextUrl.origin)
  const authContext = await getAuthContext()

  if (!authContext) {
    return NextResponse.redirect(new URL(AUTH_URLS.SIGN_IN, origin))
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

    const { redirectTo } = await signOut({
      origin,
    })

    return NextResponse.redirect(new URL(redirectTo, origin))
  }

  await setTeamCookies(team.id, team.slug)

  const redirectPath = PROTECTED_URLS.RESOLVED_ACCOUNT_SETTINGS(team.slug)
  const redirectUrl = new URL(redirectPath, origin)

  request.nextUrl.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value)
  })

  return NextResponse.redirect(redirectUrl)
}
