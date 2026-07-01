import { type NextRequest, NextResponse } from 'next/server'
import { TAB_URL_MAP } from '@/configs/dashboard-tab-url-map'
import { PROTECTED_URLS } from '@/configs/urls'
import { getAuthContext, signOut } from '@/core/server/auth'
import { resolvePublicOrigin } from '@/core/server/auth/ory/oauth-relay'
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
  const origin = resolvePublicOrigin(request.nextUrl.origin)
  const searchParams = request.nextUrl.searchParams
  const tab = searchParams.get('tab')

  const authContext = await getAuthContext()

  if (!authContext) {
    return NextResponse.redirect(new URL('/sign-in', origin))
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
      origin,
    })

    return NextResponse.redirect(new URL(redirectTo, origin))
  }

  await setTeamCookies(team.id, team.slug)

  const redirectPath = getTabRedirectPath(tab, team.slug)

  const redirectUrl = new URL(redirectPath, origin)

  if (searchParams.get('support') === 'true') {
    redirectUrl.searchParams.set('support', 'true')
  }

  // send everything to terminal if it's terminal
  if (tab === 'terminal') {
    const terminalParams = ['template', 'sandboxId', 'command', 'user', 'cwd']
    terminalParams.forEach((param) => {
      const value = searchParams.get(param)
      if (value) {
        redirectUrl.searchParams.set(param, value)
      }
    })
    searchParams.getAll('env').forEach((value) => {
      redirectUrl.searchParams.append('env', value)
    })
  }

  return NextResponse.redirect(redirectUrl)
}
