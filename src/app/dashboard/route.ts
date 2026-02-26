import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { createClient } from '@/lib/clients/supabase/server'
import { encodedRedirect } from '@/lib/utils/auth'
import { setTeamCookies } from '@/lib/utils/cookies'
import { resolveUserTeam } from '@/server/team/resolve-user-team'
import { NextRequest, NextResponse } from 'next/server'

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

  // back compatibility
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

  const team = await resolveUserTeam(data.user.id)

  if (!team) {
    // UNEXPECTED STATE - sign out and redirect to sign-in
    await supabase.auth.signOut()

    const signInUrl = new URL(AUTH_URLS.SIGN_IN, request.url)

    return encodedRedirect(
      'error',
      signInUrl.toString(),
      'No personal team found. Please contact support.'
    )
  }

  // Set team cookies for persistence
  await setTeamCookies(team.id, team.slug)

  // Determine redirect path based on tab parameter
  const urlGenerator = tab ? TAB_URL_MAP[tab] : null
  const redirectPath = urlGenerator
    ? urlGenerator(team.slug || team.id)
    : PROTECTED_URLS.SANDBOXES(team.slug || team.id)

  const redirectUrl = new URL(redirectPath, request.url)

  // Forward ?support=true to auto-open the Contact Support dialog
  if (searchParams.get('support') === 'true') {
    redirectUrl.searchParams.set('support', 'true')
  }

  return NextResponse.redirect(redirectUrl)
}
