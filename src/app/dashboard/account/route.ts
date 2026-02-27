import { type NextRequest, NextResponse } from 'next/server'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { createClient } from '@/lib/clients/supabase/server'
import { encodedRedirect } from '@/lib/utils/auth'
import { setTeamCookies } from '@/lib/utils/cookies'
import { resolveUserTeam } from '@/server/team/resolve-user-team'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return NextResponse.redirect(new URL(AUTH_URLS.SIGN_IN, request.url))
  }

  // Resolve team for the user
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

  // Build redirect URL with team
  const redirectPath = PROTECTED_URLS.RESOLVED_ACCOUNT_SETTINGS(
    team.slug || team.id
  )
  const redirectUrl = new URL(redirectPath, request.url)

  // Preserve query parameters (e.g., reauth=1)
  request.nextUrl.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value)
  })

  return NextResponse.redirect(redirectUrl)
}
