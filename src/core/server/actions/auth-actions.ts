'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { returnValidationErrors } from 'next-safe-action'
import { z } from 'zod'
import { CAPTCHA_REQUIRED_SERVER } from '@/configs/flags'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { USER_MESSAGES } from '@/configs/user-messages'
import { actionClient } from '@/core/server/actions/client'
import { returnServerError } from '@/core/server/actions/utils'
import { supabaseAdmin } from '@/core/shared/clients/supabase/admin'
import {
  forgotPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@/core/server/functions/auth/auth.types'
import {
  shouldWarnAboutAlternateEmail,
  validateEmail,
} from '@/core/server/functions/auth/validate-email'
import { l } from '@/core/shared/clients/logger/logger'
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
      const ip = headerStore.get('x-forwarded-for') ?? undefined

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

      if (signUpData.user && (ip || userAgent)) {
        await supabaseAdmin.auth.admin.updateUserById(signUpData.user.id, {
          app_metadata: {
            signup_ip: ip,
            signup_user_agent: userAgent,
          },
        })
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

export async function signOutAction(returnTo?: string) {
  const supabase = await createClient()

  await supabase.auth.signOut()

  throw redirect(
    AUTH_URLS.SIGN_IN +
      (returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '')
  )
}
