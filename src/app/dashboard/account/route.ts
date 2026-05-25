import { type NextRequest, NextResponse } from 'next/server'
import { isOryAuthEnabled } from '@/configs/flags'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { auth } from '@/core/server/auth'
import { getOrySignOutPath } from '@/core/server/auth/ory/signout'
import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'
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
    const error = 'No personal team found. Please contact support.'

    if (isOryAuthEnabled()) {
      return NextResponse.redirect(
        new URL(
          getOrySignOutPath({
            returnTo: AUTH_URLS.SIGN_IN,
            message: { type: 'error', value: error },
          }),
          request.url
        )
      )
    }

    await auth.signOut()

    return encodedRedirect(
      'error',
      new URL(AUTH_URLS.SIGN_IN, request.url).toString(),
      error
    )
  }

  await setTeamCookies(team.id, team.slug)

  const redirectPath = PROTECTED_URLS.RESOLVED_ACCOUNT_SETTINGS(team.slug)
  const redirectUrl = new URL(redirectPath, request.url)

  request.nextUrl.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value)
  })

  return NextResponse.redirect(redirectUrl)
}
