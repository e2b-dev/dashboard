import { flattenError } from 'zod'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import {
  ConfirmEmailInputSchema,
  type OtpType,
} from '@/core/modules/auth/models'
import { authRepository } from '@/core/modules/auth/repository.server'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { publicProcedure } from '@/core/server/trpc/procedures'
import { l } from '@/core/shared/clients/logger/logger'
import { isExternalOrigin } from '@/lib/utils/auth'

function buildRedirectUrl(
  type: OtpType,
  next: string,
  dashboardOrigin: string
): string {
  const nextUrl = new URL(next)
  const redirectUrl = new URL(dashboardOrigin)
  redirectUrl.pathname = nextUrl.pathname
  nextUrl.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value)
  })

  if (type === 'email_change') {
    redirectUrl.pathname = PROTECTED_URLS.ACCOUNT_SETTINGS
    redirectUrl.searchParams.set('success', 'E-Mail changed successfully')
    redirectUrl.searchParams.set('type', 'update_email')
    return redirectUrl.toString()
  }

  if (type === 'recovery') {
    redirectUrl.pathname = PROTECTED_URLS.RESET_PASSWORD
    redirectUrl.searchParams.set('reauth', '1')
    return redirectUrl.toString()
  }

  if (redirectUrl.pathname === PROTECTED_URLS.ACCOUNT_SETTINGS) {
    redirectUrl.searchParams.set('reauth', '1')
    return redirectUrl.toString()
  }

  return redirectUrl.toString()
}

function buildErrorRedirectUrl(origin: string, message: string): string {
  const url = new URL(origin + AUTH_URLS.SIGN_IN)
  url.searchParams.set('error', message)
  return url.toString()
}

function getRequestOrigin(requestUrl: string | undefined): string {
  return requestUrl ? new URL(requestUrl).origin : 'http://localhost:3000'
}

export const authRouter = createTRPCRouter({
  verifyOtp: publicProcedure
    .input(ConfirmEmailInputSchema)
    .mutation(async ({ ctx, input }) => {
      const origin = getRequestOrigin(ctx.requestUrl)
      try {
        const result = ConfirmEmailInputSchema.safeParse(input)

        if (!result.success) {
          l.error(
            {
              key: 'verify_otp:invalid_input',
              error: flattenError(result.error),
            },
            'invalid input for verify OTP'
          )

          return {
            redirectUrl: buildErrorRedirectUrl(
              origin,
              'Invalid verification link. Please request a new one.'
            ),
          }
        }

        const { token_hash, type, next } = result.data

        if (isExternalOrigin(next, origin)) {
          l.warn(
            {
              key: 'verify_otp:external_origin_rejected',
              context: {
                type,
                token_hash_prefix: token_hash.slice(0, 10),
                next_origin: new URL(next).origin,
                dashboard_origin: origin,
              },
            },
            `rejected verify OTP request with external origin: ${new URL(next).origin}`
          )

          return {
            redirectUrl: buildErrorRedirectUrl(
              origin,
              'Invalid verification link. Please request a new one.'
            ),
          }
        }

        l.info(
          {
            key: 'verify_otp:init',
            context: {
              type,
              token_hash_prefix: token_hash.slice(0, 10),
              next,
            },
          },
          `verifying OTP token: ${token_hash.slice(0, 10)}`
        )

        const verifyResult = await authRepository.verifyOtp(token_hash, type)
        if (!verifyResult.ok) {
          return {
            redirectUrl: buildErrorRedirectUrl(
              origin,
              verifyResult.error.message
            ),
          }
        }

        return { redirectUrl: buildRedirectUrl(type, next, origin) }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        l.error(
          {
            key: 'verify_otp:error',
            error: message,
          },
          `verify OTP failed: ${message}`
        )

        return {
          redirectUrl: buildErrorRedirectUrl(
            origin,
            message || 'Verification failed. Please try again.'
          ),
        }
      }
    }),
})
