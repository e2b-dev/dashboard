import { type NextRequest, NextResponse } from 'next/server'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { getAuthContext } from '@/core/server/auth'
import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'

export async function GET(request: NextRequest) {
  const authContext = await getAuthContext()

  if (!authContext) {
    const signInUrl = new URL(AUTH_URLS.SIGN_IN, request.url)
    signInUrl.searchParams.set(
      'returnTo',
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    )

    return NextResponse.redirect(signInUrl)
  }

  const team = await resolveUserTeam(
    authContext.user.id,
    authContext.accessToken
  )

  if (!team) {
    return NextResponse.redirect(new URL(PROTECTED_URLS.DASHBOARD, request.url))
  }

  const terminalUrl = new URL(PROTECTED_URLS.TERMINAL(team.slug), request.url)
  request.nextUrl.searchParams.forEach((value, key) => {
    terminalUrl.searchParams.append(key, value)
  })

  return NextResponse.redirect(terminalUrl)
}
