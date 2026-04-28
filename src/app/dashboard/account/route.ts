import { type NextRequest, NextResponse } from 'next/server'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { getSessionInsecure } from '@/core/server/functions/auth/get-session'
import { resolveUserTeam } from '@/core/server/functions/team/resolve-user-team'
import { createClient } from '@/core/shared/clients/supabase/server'
import { encodedRedirect } from '@/lib/utils/auth'
import { setTeamCookies } from '@/lib/utils/cookies'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return NextResponse.redirect(new URL(AUTH_URLS.SIGN_IN, request.url))
  }

  const session = await getSessionInsecure(supabase)

  if (!session) {
    return NextResponse.redirect(new URL(AUTH_URLS.SIGN_IN, request.url))
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

  const redirectPath = PROTECTED_URLS.RESOLVED_ACCOUNT_SETTINGS(team.slug)
  const redirectUrl = new URL(redirectPath, request.url)

  request.nextUrl.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value)
  })

  return NextResponse.redirect(redirectUrl)
}
