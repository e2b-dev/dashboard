import { type NextRequest, NextResponse } from 'next/server'
import { TAB_URL_MAP } from '@/configs/dashboard-tab-url-map'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { auth } from '@/core/server/auth'
import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'
import { encodedRedirect } from '@/lib/utils/auth'
import { setTeamCookies } from '@/lib/utils/cookies'

function getTabRedirectPath(tab: string | null, teamSlug: string) {
  if (tab && Object.hasOwn(TAB_URL_MAP, tab)) {
    const urlGenerator = TAB_URL_MAP[tab]

    if (urlGenerator) {
      return urlGenerator(teamSlug)
    }
  }

  return PROTECTED_URLS.SANDBOXES(teamSlug)
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const tab = searchParams.get('tab')

  const authContext = await auth.getAuthContext()

  if (!authContext) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  const team = await resolveUserTeam(
    authContext.userId,
    authContext.accessToken
  )

  if (!team) {
    await auth.signOut()

    const signInUrl = new URL(AUTH_URLS.SIGN_IN, request.url)

    return encodedRedirect(
      'error',
      signInUrl.toString(),
      'No personal team found. Please contact support.'
    )
  }

  await setTeamCookies(team.id, team.slug)

  const redirectPath = getTabRedirectPath(tab, team.slug)

  const redirectUrl = new URL(redirectPath, request.url)

  if (searchParams.get('support') === 'true') {
    redirectUrl.searchParams.set('support', 'true')
  }

  return NextResponse.redirect(redirectUrl)
}
