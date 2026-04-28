import { type NextRequest, NextResponse } from 'next/server'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { getSessionInsecure } from '@/core/server/functions/auth/get-session'
import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'
import { createClient } from '@/core/shared/clients/supabase/server'
import { encodedRedirect } from '@/lib/utils/auth'
import { setTeamCookies } from '@/lib/utils/cookies'

export const TAB_URL_MAP: Record<string, (teamSlug: string) => string> = {
  sandboxes: (teamSlug) => PROTECTED_URLS.SANDBOXES(teamSlug),
  templates: (teamSlug) => PROTECTED_URLS.TEMPLATES(teamSlug),
  usage: (teamSlug) => PROTECTED_URLS.USAGE(teamSlug),
  billing: (teamSlug) => PROTECTED_URLS.BILLING(teamSlug),
  limits: (teamSlug) => PROTECTED_URLS.LIMITS(teamSlug),
  keys: (teamSlug) => PROTECTED_URLS.KEYS(teamSlug),
  settings: (teamSlug) => PROTECTED_URLS.GENERAL(teamSlug),
  team: (teamSlug) => PROTECTED_URLS.GENERAL(teamSlug),
  general: (teamSlug) => PROTECTED_URLS.GENERAL(teamSlug),
  members: (teamSlug) => PROTECTED_URLS.MEMBERS(teamSlug),
  account: (_) => PROTECTED_URLS.ACCOUNT_SETTINGS,
  personal: (_) => PROTECTED_URLS.ACCOUNT_SETTINGS,

  budget: (teamSlug) => PROTECTED_URLS.LIMITS(teamSlug),
}

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

  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  const session = await getSessionInsecure(supabase)

  if (!session) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  const team = await resolveUserTeam(data.user.id, session.access_token)

  if (!team) {
    await supabase.auth.signOut()

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
