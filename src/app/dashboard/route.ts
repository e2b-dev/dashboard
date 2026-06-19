import { type NextRequest, NextResponse } from 'next/server'
import { TAB_URL_MAP } from '@/configs/dashboard-tab-url-map'
import { PROTECTED_URLS } from '@/configs/urls'
import { getAuthContext, signOut } from '@/core/server/auth'
import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'
import { l } from '@/core/shared/clients/logger/logger'
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

  const authContext = await getAuthContext()

  if (!authContext) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  const team = await resolveUserTeam(
    authContext.user.id,
    authContext.accessToken
  )

  if (!team) {
    l.warn(
      {
        key: 'dashboard:no_personal_team',
        user_id: authContext.user.id,
      },
      'no personal team for user, signing out'
    )

    const { redirectTo } = await signOut({
      origin: request.nextUrl.origin,
    })

    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  await setTeamCookies(team.id, team.slug)

  const redirectPath = getTabRedirectPath(tab, team.slug)

  const redirectUrl = new URL(redirectPath, request.url)

  if (searchParams.get('support') === 'true') {
    redirectUrl.searchParams.set('support', 'true')
  }

  return NextResponse.redirect(redirectUrl)
}
