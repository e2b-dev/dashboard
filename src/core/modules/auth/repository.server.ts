import 'server-only'

import type { OtpType } from '@/core/modules/auth/models'
import { supabaseAuthFlows } from '@/core/server/auth/supabase/flows'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { repoErrorFromHttp } from '@/core/shared/errors'
import { err, ok, type RepoResult } from '@/core/shared/result'

interface VerifyOtpResult {
  userId: string
}

type AuthRepositoryDeps = {
  flows: Pick<typeof supabaseAuthFlows, 'verifyOtp'>
}

interface AuthRepository {
  verifyOtp(
    tokenHash: string,
    type: OtpType
  ): Promise<RepoResult<VerifyOtpResult>>
}

function createAuthRepository(deps: AuthRepositoryDeps): AuthRepository {
  return {
    async verifyOtp(tokenHash, type) {
      const { data, error } = await deps.flows.verifyOtp({
        type,
        token_hash: tokenHash,
      })

      if (error) {
        l.error(
          {
            key: 'auth_repository:verify_otp:error',
            error: serializeErrorForLog(error),
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
          return err(
            repoErrorFromHttp(
              400,
              'Email link has expired. Please request a new one.',
              error
            )
          )
        }

        return err(
          repoErrorFromHttp(400, 'Invalid or expired verification link.', error)
        )
      }

      if (!data.user) {
        return err(
          repoErrorFromHttp(500, 'Verification failed. Please try again.')
        )
      }

      return ok({
        userId: data.user.id,
      })
    },
  }
}

export const authRepository = createAuthRepository({
  flows: supabaseAuthFlows,
})
