import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { l } from '@/lib/clients/logger/logger'
import {
  ConfirmEmailInputSchema,
  type OtpType,
} from '@/server/api/models/auth.models'
import { authRepo } from '@/server/api/repositories/auth.repository'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Determines the redirect URL based on OTP type and the original next parameter.
 */
function buildRedirectUrl(type: OtpType, next: string): string {
  const redirectUrl = new URL(next)

  // recovery flow always goes to account settings with reauth flag
  if (type === 'recovery') {
    redirectUrl.pathname = PROTECTED_URLS.RESET_PASSWORD
    redirectUrl.searchParams.set('reauth', '1')
    return redirectUrl.toString()
  }

  // reauth flow for account settings
  if (redirectUrl.pathname === PROTECTED_URLS.ACCOUNT_SETTINGS) {
    redirectUrl.searchParams.set('reauth', '1')
    return redirectUrl.toString()
  }

  return next
}

/**
 * Builds a redirect URL to sign-in with an encoded error message.
 */
function buildErrorRedirectUrl(origin: string, message: string): string {
  const url = new URL(origin + AUTH_URLS.SIGN_IN)
  url.searchParams.set('error', encodeURIComponent(message))
  return url.toString()
}

export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin

  try {
    const body = await request.json()

    const result = ConfirmEmailInputSchema.safeParse(body)

    if (!result.success) {
      l.error(
        {
          key: 'verify_otp:invalid_input',
          error: result.error.flatten(),
        },
        'invalid input for verify OTP'
      )

      const errorRedirectUrl = buildErrorRedirectUrl(
        origin,
        'Invalid verification link. Please request a new one.'
      )

      return NextResponse.json({ redirectUrl: errorRedirectUrl })
    }

    const { token_hash, type, next } = result.data

    l.info(
      {
        key: 'verify_otp:init',
        context: {
          type,
          tokenHashPrefix: token_hash.slice(0, 10),
          next,
        },
      },
      `verifying OTP token: ${token_hash.slice(0, 10)}`
    )

    const { userId } = await authRepo.verifyOtp(token_hash, type)

    const redirectUrl = buildRedirectUrl(type, next)

    return NextResponse.json({ redirectUrl })
  } catch (error) {
    // handle known errors from repository
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message: string }).message

      l.error(
        {
          key: 'verify_otp:error',
          error: message,
        },
        `verify OTP failed: ${message}`
      )

      const errorRedirectUrl = buildErrorRedirectUrl(origin, message)

      return NextResponse.json({ redirectUrl: errorRedirectUrl })
    }

    l.error(
      {
        key: 'verify_otp:unknown_error',
        error: String(error),
      },
      'verify OTP failed with unknown error'
    )

    const errorRedirectUrl = buildErrorRedirectUrl(
      origin,
      'Verification failed. Please try again.'
    )

    return NextResponse.json({ redirectUrl: errorRedirectUrl })
  }
}
