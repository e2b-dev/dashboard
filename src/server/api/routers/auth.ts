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
