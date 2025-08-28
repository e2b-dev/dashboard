import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { l } from '@/lib/clients/logger'
import { createClient } from '@/lib/clients/supabase/server'
import { encodedRedirect } from '@/lib/utils/auth'
import { redirect } from 'next/navigation'
import { serializeError } from 'serialize-error'

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs

  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const returnTo = requestUrl.searchParams.get('returnTo')?.toString()
  const redirectTo = requestUrl.searchParams.get('redirect_to')?.toString()

  l.info(
    {
      key: 'auth_callback:request',
      context: {
        code: !!code,
        origin,
        returnTo,
        redirectTo,
      },
    },
    `Auth callback request received`
  )

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      l.error(
        {
          key: 'auth_callback:supabase_error',
          error: serializeError(error),
          context: {
            code,
            origin,
            returnTo,
            redirectTo,
          },
        },
        `Auth callback supabase error: ${error.message}`
      )

      throw encodedRedirect('error', AUTH_URLS.SIGN_IN, error.message)
    } else {
      l.info(
        {
          key: 'auth_callback:otp_exchanged',
          user_id: data.user.id,
        },
        `OTP successfully exchanged for user session`
      )
    }
  }

  if (redirectTo) {
    const returnToUrl = new URL(redirectTo, origin)
    if (returnToUrl.origin === origin) {
      l.info(
        {
          key: 'auth_callback:redirecting_to',
          context: {
            redirectTo,
          },
        },
        `Redirecting to ${redirectTo}`
      )
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
      l.info(
        {
          key: 'auth_callback:returning_to',
          context: {
            returnTo,
          },
        },
        `Returning to ${returnTo}`
      )
      return redirect(returnTo)
    }
  }

  // Default redirect to dashboard
  l.info(
    {
      key: 'auth_callback:redirecting_to_dashboard',
      context: {
        returnTo,
      },
    },
    `Redirecting to dashboard`
  )
  return redirect(PROTECTED_URLS.DASHBOARD)
}
