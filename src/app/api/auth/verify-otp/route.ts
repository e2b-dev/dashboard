import { PROTECTED_URLS } from '@/configs/urls'
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

export async function POST(request: NextRequest) {
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

      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      )
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

    l.info(
      {
        key: 'verify_otp:success',
        user_id: userId,
        context: {
          type,
          redirectUrl,
        },
      },
      `OTP verified for user: ${userId}, redirecting to: ${redirectUrl}`
    )

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

      return NextResponse.json(
        { error: message },
        { status: 400 }
      )
    }

    l.error(
      {
        key: 'verify_otp:unknown_error',
        error: String(error),
      },
      'verify OTP failed with unknown error'
    )

    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    )
  }
}

