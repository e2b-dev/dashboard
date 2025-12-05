import { l } from '@/lib/clients/logger/logger'
import { createClient } from '@/lib/clients/supabase/server'
import { TRPCError } from '@trpc/server'
import { serializeError } from 'serialize-error'
import type { OtpType } from '../models/auth.models'

interface VerifyOtpResult {
  userId: string
}

/**
 * Verifies an OTP token with Supabase Auth.
 * Creates a session and sets auth cookies on success.
 * @throws TRPCError on verification failure
 */
async function verifyOtp(
  tokenHash: string,
  type: OtpType
): Promise<VerifyOtpResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  })

  if (error) {
    l.error(
      {
        key: 'auth_repository:verify_otp:error',
        error: serializeError(error),
        context: {
          type,
          tokenHashPrefix: tokenHash.slice(0, 10),
          errorCode: error.code,
          errorStatus: error.status,
        },
      },
      `failed to verify OTP: ${error.message}`
    )

    if (error.status === 403 && error.code === 'otp_expired') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Email link has expired. Please request a new one.',
      })
    }

    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid or expired verification link.',
    })
  }

  if (!data.user) {
    l.error(
      {
        key: 'auth_repository:verify_otp:no_user',
        context: {
          type,
          tokenHashPrefix: tokenHash.slice(0, 10),
        },
      },
      `failed to verify OTP: no user found for token hash: ${tokenHash.slice(0, 10)}`
    )

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Verification failed. Please try again.',
    })
  }

  // verify session was created (cookies should be set by supabase client)
  const hasSession = !!data.session
  const hasAccessToken = !!data.session?.access_token
  const hasRefreshToken = !!data.session?.refresh_token

  l.info(
    {
      key: 'auth_repository:verify_otp:success',
      user_id: data.user.id,
      context: {
        type,
        tokenHashPrefix: tokenHash.slice(0, 10),
        hasSession,
        hasAccessToken,
        hasRefreshToken,
        sessionExpiresAt: data.session?.expires_at,
      },
    },
    `verified OTP for user: ${data.user.id}, session: ${hasSession}`
  )

  if (!hasSession) {
    l.warn(
      {
        key: 'auth_repository:verify_otp:no_session',
        user_id: data.user.id,
        context: { type, tokenHashPrefix: tokenHash.slice(0, 10) },
      },
      `OTP verified but no session returned - user may not be signed in`
    )
  }

  return {
    userId: data.user.id,
  }
}

export const authRepo = {
  verifyOtp,
}
