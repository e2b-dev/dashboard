import { type NextRequest, NextResponse } from 'next/server'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { getSessionInsecure } from '@/core/server/functions/auth/get-session'
import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'
import { createClient } from '@/core/shared/clients/supabase/server'
import { encodedRedirect } from '@/lib/utils/auth'
import { setTeamCookies } from '@/lib/utils/cookies'

export const TAB_URL_MAP: Record<string, (teamId: string) => string> = {
  sandboxes: (teamId) => PROTECTED_URLS.SANDBOXES(teamId),
  templates: (teamId) => PROTECTED_URLS.TEMPLATES(teamId),
  usage: (teamId) => PROTECTED_URLS.USAGE(teamId),
  billing: (teamId) => PROTECTED_URLS.BILLING(teamId),
  limits: (teamId) => PROTECTED_URLS.LIMITS(teamId),
  keys: (teamId) => PROTECTED_URLS.KEYS(teamId),
  settings: (teamId) => PROTECTED_URLS.GENERAL(teamId),
  team: (teamId) => PROTECTED_URLS.GENERAL(teamId),
  general: (teamId) => PROTECTED_URLS.GENERAL(teamId),
  members: (teamId) => PROTECTED_URLS.MEMBERS(teamId),
  account: (_) => PROTECTED_URLS.ACCOUNT_SETTINGS,
  personal: (_) => PROTECTED_URLS.ACCOUNT_SETTINGS,

  budget: (teamId) => PROTECTED_URLS.LIMITS(teamId),
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

  const team = await resolveUserTeam(session.access_token)

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

  const urlGenerator = tab ? TAB_URL_MAP[tab] : null
  const redirectPath = urlGenerator
    ? urlGenerator(team.slug || team.id)
    : PROTECTED_URLS.SANDBOXES(team.slug || team.id)

  const redirectUrl = new URL(redirectPath, request.url)

  if (searchParams.get('support') === 'true') {
    redirectUrl.searchParams.set('support', 'true')
  }

  return NextResponse.redirect(redirectUrl)
}
