import { createClient } from '@/lib/clients/supabase/server'
import { redirect } from 'next/navigation'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { logError, logInfo } from '@/lib/clients/logger'
import { ERROR_CODES } from '@/configs/logs'

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs

  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const returnTo = requestUrl.searchParams.get('returnTo')?.toString()
  const redirectTo = requestUrl.searchParams.get('redirect_to')?.toString()

  logInfo('Auth callback:', {
    code: !!code,
    origin,
    returnTo,
  })

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      logError(
        ERROR_CODES.SUPABASE,
        'Error exchanging code for session:',
        error
      )
    } else {
      logInfo('OTP was successfully exchanged for user:', data.user.id)
    }
  }

  if (redirectTo) {
    const returnToUrl = new URL(redirectTo, origin)
    if (returnToUrl.origin === origin) {
      logInfo('Redirecting to:', redirectTo)
      return redirect(redirectTo)
    }
  }

  // If returnTo is present, redirect there
  if (returnTo) {
    // Ensure returnTo is a relative URL to prevent open redirect vulnerabilities
    const returnToUrl = new URL(returnTo, origin)
    if (returnToUrl.origin === origin) {
      logInfo('Returning to:', returnTo)
      return redirect(returnTo)
    }
  }

  // Default redirect to dashboard
  logInfo('Redirecting to dashboard')
  return redirect(PROTECTED_URLS.DASHBOARD)
}
