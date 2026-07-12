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

/**
 * `/dashboard?tab=<tab>` resolves the user's default team and redirects to the
 * team-scoped page (e.g. `/dashboard/keys` -> `/dashboard/<team-slug>/keys`).
 *
 * This is NOT legacy: these links are stable public entrypoints crosslinked
 * from emails, docs, and the CLI, so this route must keep working. See
 * `TAB_URL_MAP` for the supported tabs.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const tab = searchParams.get('tab')
  const publicOrigin = process.env.APP_URL ?? request.nextUrl.origin

  const authContext = await getAuthContext()

  if (!authContext) {
    return NextResponse.redirect(new URL('/sign-in', publicOrigin))
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
      origin: publicOrigin,
    })

    return NextResponse.redirect(new URL(redirectTo, publicOrigin))
  }

  await setTeamCookies(team.id, team.slug)

  const redirectPath = getTabRedirectPath(tab, team.slug)

  const redirectUrl = new URL(redirectPath, publicOrigin)

  if (searchParams.get('support') === 'true') {
    redirectUrl.searchParams.set('support', 'true')
  }

  return NextResponse.redirect(redirectUrl)
}
