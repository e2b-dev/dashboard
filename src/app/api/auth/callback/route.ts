import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { l } from '@/lib/clients/logger'
import { createClient } from '@/lib/clients/supabase/server'
import { encodedRedirect } from '@/lib/utils/auth'
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs

  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const returnTo = requestUrl.searchParams.get('returnTo')?.toString()
  const redirectTo = requestUrl.searchParams.get('redirect_to')?.toString()

  l.info('AUTH_CALLBACK:REQUEST', {
    code: !!code,
    origin,
    returnTo,
    redirectTo,
  })

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      l.error('AUTH_CALLBACK:SUPABASE_ERROR', error, {
        code,
        origin,
        returnTo,
        redirectTo,
      })

      throw encodedRedirect('error', AUTH_URLS.SIGN_IN, error.message)
    } else {
      l.info('AUTH_CALLBACK:OTP_EXCHANGED', {
        userId: data.user.id,
      })
    }
  }

  if (redirectTo) {
    const returnToUrl = new URL(redirectTo, origin)
    if (returnToUrl.origin === origin) {
      l.info('AUTH_CALLBACK:REDIRECTING_TO', {
        redirectTo,
      })
      return redirect(redirectTo)
    }
  }

  // If returnTo is present, redirect there
  if (returnTo) {
    // Ensure returnTo is a relative URL to prevent open redirect vulnerabilities
    const returnToUrl = new URL(returnTo, origin)

    if (returnTo === PROTECTED_URLS.ACCOUNT_SETTINGS) {
      returnToUrl.searchParams.set('reauth', '1')
      return redirect(returnToUrl.toString())
    }

    if (returnToUrl.origin === origin) {
      l.info('AUTH_CALLBACK:RETURNING_TO', {
        returnTo,
      })
      return redirect(returnTo)
    }
  }

  // Default redirect to dashboard
  l.info('AUTH_CALLBACK:REDIRECTING_TO_DASHBOARD')
  return redirect(PROTECTED_URLS.DASHBOARD)
}
