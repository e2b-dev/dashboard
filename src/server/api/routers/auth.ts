import { PROTECTED_URLS } from '@/configs/urls'
import { createTRPCRouter } from '../init'
import {
  ConfirmEmailInputSchema,
  type ConfirmEmailResult,
  type OtpType,
} from '../models/auth.models'
import { publicProcedure } from '../procedures'
import { authRepo } from '../repositories/auth.repository'

/**
 * Determines the redirect URL based on OTP type and the original next parameter.
 * Handles relative URLs (e.g., /dashboard)
 */
function buildRedirectUrl(type: OtpType, next: string): string {
  // recovery flow always goes to account settings with reauth flag
  if (type === 'recovery') {
    return `${PROTECTED_URLS.RESET_PASSWORD}?reauth=1`
  }

  // reauth flow for account settings
  if (next.startsWith(PROTECTED_URLS.ACCOUNT_SETTINGS)) {
    const hasQuery = next.includes('?')
    return hasQuery ? `${next}&reauth=1` : `${next}?reauth=1`
  }

  return next
}

export const authRouter = createTRPCRouter({
  confirmEmail: publicProcedure
    .input(ConfirmEmailInputSchema)
    .mutation(async ({ input }): Promise<ConfirmEmailResult> => {
      const { token_hash, type, next } = input

      await authRepo.verifyOtp(token_hash, type)

      const redirectUrl = buildRedirectUrl(type, next)

      return { redirectUrl }
    }),
})
