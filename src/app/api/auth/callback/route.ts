import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { USER_MESSAGES } from '@/configs/user-messages'
import { l } from '@/lib/clients/logger/logger'
import { createClient } from '@/lib/clients/supabase/server'
import { encodedRedirect, isOAuthEmailVerified } from '@/lib/utils/auth'
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

      // Check email verification only for new users (signup)
      // Existing users with linked identities can sign in with any provider
      const isNewUser = data.user.identities?.length === 1

      if (isNewUser) {
        const emailVerification = isOAuthEmailVerified(data.user)

        if (!emailVerification.verified) {
          l.warn(
            {
              key: 'auth_callback:email_not_verified',
              user_id: data.user.id,
              provider: emailVerification.provider,
              reason: emailVerification.reason,
            },
            `User OAuth email not verified: ${emailVerification.reason}`
          )

          // Sign out the user since they don't have a verified email
          await supabase.auth.signOut()

          // Redirect with appropriate error message based on provider
          let errorMessage: string
          if (emailVerification.provider === 'google') {
            errorMessage = USER_MESSAGES.googleEmailNotVerified.message
          } else if (emailVerification.provider === 'github') {
            errorMessage = USER_MESSAGES.githubEmailNotVerified.message
          } else if (emailVerification.provider) {
            errorMessage = USER_MESSAGES.oauthEmailNotVerified.message
          } else {
            errorMessage = USER_MESSAGES.genericEmailNotVerified.message
          }

          throw encodedRedirect('error', AUTH_URLS.SIGN_IN, errorMessage)
        }

        l.info(
          {
            key: 'auth_callback:email_verified',
            user_id: data.user.id,
          },
          `User OAuth email verified successfully`
        )
      } else {
        l.info(
          {
            key: 'auth_callback:existing_user',
            user_id: data.user.id,
          },
          `Existing user sign-in, skipping email verification check`
        )
      }
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
