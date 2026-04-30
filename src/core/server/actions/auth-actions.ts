'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { returnValidationErrors } from 'next-safe-action'
import { z } from 'zod'
import { CAPTCHA_REQUIRED_SERVER } from '@/configs/flags'
import { KV_KEYS } from '@/configs/keys'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { USER_MESSAGES } from '@/configs/user-messages'
import { actionClient } from '@/core/server/actions/client'
import { returnServerError } from '@/core/server/actions/utils'
import {
  forgotPasswordSchema,
  resendSignupVerificationSchema,
  signInSchema,
  signUpSchema,
} from '@/core/server/functions/auth/auth.types'
import {
  shouldWarnAboutAlternateEmail,
  validateEmail,
} from '@/core/server/functions/auth/validate-email'
import { kv } from '@/core/shared/clients/kv'
import { l } from '@/core/shared/clients/logger/logger'
import { supabaseAdmin } from '@/core/shared/clients/supabase/admin'
import { createClient } from '@/core/shared/clients/supabase/server'
import { relativeUrlSchema } from '@/core/shared/schemas/url'
import { verifyTurnstileToken } from '@/lib/captcha/turnstile'
import { encodedRedirect } from '@/lib/utils/auth'

async function validateCaptcha(captchaToken: string | undefined) {
  if (!CAPTCHA_REQUIRED_SERVER) {
    return null
  }

  if (!captchaToken) {
    return returnServerError(USER_MESSAGES.captchaRequired.message)
  }

  const isValidCaptcha = await verifyTurnstileToken(captchaToken)
  if (!isValidCaptcha) {
    return returnServerError(USER_MESSAGES.captchaFailed.message)
  }

  return null
}

async function checkAuthProviderHealth(): Promise<boolean> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`,
      {
        method: 'GET',
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 30 },
      }
    )
    return response.ok
  } catch {
    return false
  }
}

const AUTH_PROVIDER_ERROR_MESSAGE =
  'Our authentication provider is experiencing issues. Please try again later.'
const RESEND_SIGNUP_VERIFICATION_COOLDOWN_SECONDS = 60
const RESEND_SIGNUP_VERIFICATION_HASH_PREFIX_LENGTH = 24

function hashCooldownPart(value: string): string {
  return createHash('sha256')
    .update(value)
    .digest('hex')
    .slice(0, RESEND_SIGNUP_VERIFICATION_HASH_PREFIX_LENGTH)
}

const SignInWithOAuthInputSchema = z.object({
  provider: z.union([z.literal('github'), z.literal('google')]),
  returnTo: relativeUrlSchema.optional(),
})

export const signInWithOAuthAction = actionClient
  .inputSchema(SignInWithOAuthInputSchema)
  .metadata({ actionName: 'signInWithOAuth' })
  .action(async ({ parsedInput }) => {
    const { provider, returnTo } = parsedInput

    const isHealthy = await checkAuthProviderHealth()
    if (!isHealthy) {
      const queryParams = returnTo ? { returnTo } : undefined
      throw encodedRedirect(
        'error',
        AUTH_URLS.SIGN_IN,
        AUTH_PROVIDER_ERROR_MESSAGE,
        queryParams
      )
    }

    const supabase = await createClient()

    const headerStore = await headers()

    const origin = headerStore.get('origin')

    if (!origin) {
      throw new Error('Origin not found')
    }

    l.info(
      {
        key: 'sign_in_with_oauth_action:init',
        context: {
          provider,
          returnTo,
        },
      },
      `sign_in_with_oauth_action: initializing OAuth sign-in with provider: ${provider}`
    )

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: `${origin}${AUTH_URLS.CALLBACK}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`,
        scopes: 'email',
      },
    })

    if (error) {
      l.error(
        {
          key: 'sign_in_with_oauth_action:supabase_error',
          context: {
            provider,
            returnTo,
          },
        },
        `sign_in_with_oauth_action: supabase error: ${error.message}`
      )

      const queryParams = returnTo ? { returnTo } : undefined
      throw encodedRedirect(
        'error',
        AUTH_URLS.SIGN_IN,
        error.message,
        queryParams
      )
    }

    throw redirect(data.url)
  })

export const signUpAction = actionClient
  .schema(signUpSchema)
  .metadata({ actionName: 'signUp' })
  .action(
    async ({
      parsedInput: { email, password, returnTo = '', captchaToken },
    }) => {
      const captchaError = await validateCaptcha(captchaToken)
      if (captchaError) return captchaError

      const isHealthy = await checkAuthProviderHealth()
      if (!isHealthy) {
        const queryParams = returnTo ? { returnTo } : undefined
        throw encodedRedirect(
          'error',
          AUTH_URLS.SIGN_UP,
          AUTH_PROVIDER_ERROR_MESSAGE,
          queryParams
        )
      }

      const supabase = await createClient()
      const headerStore = await headers()

      const origin = headerStore.get('origin')

      if (!origin) {
        throw new Error('Origin not found')
      }

      const userAgent = headerStore.get('user-agent') ?? undefined
      const ip =
        headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined

      // basic security check, that password does not equal e-mail
      if (password && email && password.toLowerCase() === email.toLowerCase()) {
        return returnValidationErrors(signUpSchema, {
          password: {
            _errors: ['Password is too weak.'],
          },
        })
      }

      const validationResult = await validateEmail(email)

      if (validationResult?.data) {
        if (!validationResult.valid) {
          return returnServerError(
            USER_MESSAGES.signUpEmailValidationInvalid.message
          )
        }

        if (await shouldWarnAboutAlternateEmail(validationResult.data)) {
          return returnServerError(USER_MESSAGES.signUpEmailAlternate.message)
        }
      }

      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}${AUTH_URLS.CALLBACK}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`,
          data: validationResult?.data
            ? { email_validation: validationResult.data }
            : undefined,
        },
      })

      if (error) {
        switch (error.code) {
          case 'email_exists':
            return returnServerError(USER_MESSAGES.emailInUse.message)
          case 'weak_password':
            return returnServerError(USER_MESSAGES.passwordWeak.message)
          default:
            throw error
        }
      }

      if (
        signUpData.user &&
        signUpData.user.identities?.length !== 0 &&
        (ip || userAgent)
      ) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(signUpData.user.id, {
            app_metadata: {
              signup_ip: ip,
              signup_user_agent: userAgent,
            },
          })
        } catch (metaError) {
          l.error(
            { key: 'sign_up_action:metadata_update_error', error: metaError },
            'sign_up_action: failed to write signup metadata to app_metadata'
          )
        }
      }
    }
  )

export const signInAction = actionClient
  .schema(signInSchema)
  .metadata({ actionName: 'signInWithEmailAndPassword' })
  .action(async ({ parsedInput: { email, password, returnTo = '' } }) => {
    const isHealthy = await checkAuthProviderHealth()
    if (!isHealthy) {
      const queryParams = returnTo ? { returnTo } : undefined
      throw encodedRedirect(
        'error',
        AUTH_URLS.SIGN_IN,
        AUTH_PROVIDER_ERROR_MESSAGE,
        queryParams
      )
    }

    const supabase = await createClient()

    const headerStore = await headers()

    const origin = headerStore.get('origin')

    if (!origin) {
      throw new Error('Origin not found')
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.code === 'invalid_credentials') {
        return returnServerError(USER_MESSAGES.invalidCredentials.message)
      }
      if (error.code === 'email_not_confirmed') {
        return returnServerError(USER_MESSAGES.signInEmailNotConfirmed.message)
      }
      throw error
    }

    // handle extra case for password reset
    if (
      returnTo.trim().length > 0 &&
      returnTo === PROTECTED_URLS.ACCOUNT_SETTINGS
    ) {
      const url = new URL(returnTo, origin)

      url.searchParams.set('reauth', '1')

      throw redirect(url.toString())
    }

    throw redirect(returnTo || PROTECTED_URLS.DASHBOARD)
  })

export const forgotPasswordAction = actionClient
  .schema(forgotPasswordSchema)
  .metadata({ actionName: 'forgotPassword' })
  .action(async ({ parsedInput: { email } }) => {
    const isHealthy = await checkAuthProviderHealth()
    if (!isHealthy) {
      throw encodedRedirect(
        'error',
        AUTH_URLS.FORGOT_PASSWORD,
        AUTH_PROVIDER_ERROR_MESSAGE
      )
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email)

    if (error) {
      l.error(
        {
          key: 'forgot_password_action:supabase_error',
          error,
        },
        `Password reset failed: ${error.message || 'Unknown error'}`
      )

      if (error.message.includes('security purposes')) {
        return returnServerError(
          'Please wait before requesting another password reset.'
        )
      }

      throw error
    }
  })

export const resendSignupVerificationAction = actionClient
  .schema(resendSignupVerificationSchema)
  .metadata({ actionName: 'resendSignupVerification' })
  .action(async ({ parsedInput: { email, returnTo = '' } }) => {
    const headerStore = await headers()
    const origin = headerStore.get('origin')

    if (!origin) {
      throw new Error('Origin not found')
    }

    const normalizedEmail = email.trim().toLowerCase()
    const requesterIp =
      headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown-ip'
    const requesterUserAgent = headerStore.get('user-agent') ?? 'unknown-agent'

    const emailHash = hashCooldownPart(normalizedEmail)
    const requesterHash = hashCooldownPart(
      `${requesterIp}:${requesterUserAgent}`
    )
    const cooldownKey = KV_KEYS.AUTH_RESEND_SIGNUP_VERIFICATION_COOLDOWN(
      emailHash,
      requesterHash
    )

    try {
      const cooldownKeyExists = await kv.get<boolean>(cooldownKey)

      if (cooldownKeyExists) {
        return
      }

      await kv.set(cooldownKey, true, {
        ex: RESEND_SIGNUP_VERIFICATION_COOLDOWN_SECONDS,
      })
    } catch (kvError) {
      l.warn(
        {
          key: 'resend_signup_verification_action:kv_error',
          error: kvError,
          context: {
            email_hash: emailHash,
            requester_hash: requesterHash,
          },
        },
        'failed to access resend verification cooldown key'
      )
    }

    const callbackUrl = `${origin}${AUTH_URLS.CALLBACK}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`

    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail,
        options: {
          emailRedirectTo: callbackUrl,
        },
      })

      if (error) {
        l.warn(
          {
            key: 'resend_signup_verification_action:supabase_error',
            error,
            context: {
              email_hash: emailHash,
              requester_hash: requesterHash,
              has_return_to: returnTo.length > 0,
            },
          },
          `failed to resend signup verification email: ${error.message}`
        )
      }
    } catch (error) {
      l.warn(
        {
          key: 'resend_signup_verification_action:unexpected_error',
          error,
          context: {
            email_hash: emailHash,
            requester_hash: requesterHash,
            has_return_to: returnTo.length > 0,
          },
        },
        'unexpected error while resending signup verification email'
      )
    }
  })

export async function signOutAction(returnTo?: string) {
  const supabase = await createClient()

  await supabase.auth.signOut()

  throw redirect(
    AUTH_URLS.SIGN_IN +
      (returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '')
  )
}
