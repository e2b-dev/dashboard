'use server'

import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { USER_MESSAGES } from '@/configs/user-messages'
import { actionClient } from '@/lib/clients/action'
import { l } from '@/lib/clients/logger/logger'
import { createClient } from '@/lib/clients/supabase/server'
import { relativeUrlSchema } from '@/lib/schemas/url'
import { returnServerError } from '@/lib/utils/action'
import { encodedRedirect } from '@/lib/utils/auth'
import {
  shouldWarnAboutAlternateEmail,
  validateEmail,
} from '@/server/auth/validate-email'
import { returnValidationErrors } from 'next-safe-action'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { forgotPasswordSchema, signInSchema, signUpSchema } from './auth.types'

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
  .action(async ({ parsedInput: { email, password, returnTo = '' } }) => {
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}${AUTH_URLS.CALLBACK}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`,
        data: validationResult?.data
          ? {
              email_validation: validationResult?.data,
            }
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
  })

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
