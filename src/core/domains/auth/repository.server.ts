import 'server-only'

import { TRPCError } from '@trpc/server'
import { serializeError } from 'serialize-error'
import type { OtpType } from '@/core/domains/auth/models'
import { l } from '@/lib/clients/logger/logger'
import { createClient } from '@/lib/clients/supabase/server'

interface VerifyOtpResult {
  userId: string
}

type AuthRepositoryDeps = {
  createSupabaseClient: typeof createClient
}

export interface AuthRepository {
  verifyOtp(tokenHash: string, type: OtpType): Promise<VerifyOtpResult>
}

export function createAuthRepository(deps: AuthRepositoryDeps): AuthRepository {
  return {
    async verifyOtp(tokenHash, type) {
      const supabase = await deps.createSupabaseClient()

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
              token_hash_prefix: tokenHash.slice(0, 10),
              error_code: error.code,
              error_status: error.status,
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
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Verification failed. Please try again.',
        })
      }

      return {
        userId: data.user.id,
      }
    },
  }
}

export const authRepository = createAuthRepository({
  createSupabaseClient: createClient,
})
