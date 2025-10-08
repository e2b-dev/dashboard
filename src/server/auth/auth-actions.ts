'use server'

import { USE_BOT_ID } from '@/configs/flags'
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
import { checkBotId } from 'botid/server'
import { returnValidationErrors } from 'next-safe-action'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { forgotPasswordSchema, signInSchema, signUpSchema } from './auth.types'

const ProviderSchema = z.enum(['google', 'github'])

export const signInWithOAuthAction = actionClient
  .schema(
    z.object({
      provider: ProviderSchema,
      returnTo: relativeUrlSchema.optional(),
    })
  )
  .metadata({ actionName: 'signInWithOAuth' })
  .action(async ({ parsedInput, ctx }) => {
    const { provider, returnTo } = parsedInput

    const supabase = await createClient()

    const origin = (await headers()).get('origin')

    l.info(
      {
        key: 'sign_in_with_oauth_action:init',
        provider,
        returnTo,
      },
      `Initializing OAuth sign-in with provider ${provider}`
    )

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: `${origin}${AUTH_URLS.CALLBACK}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`,
        scopes: 'email',
      },
    })

    if (error) {
      const queryParams = returnTo ? { returnTo } : undefined
      throw encodedRedirect(
        'error',
        AUTH_URLS.SIGN_IN,
        error.message,
        queryParams
      )
    }

    if (data.url) {
      redirect(data.url)
    }

    throw encodedRedirect(
      'error',
      AUTH_URLS.SIGN_IN,
      'Something went wrong',
      returnTo ? { returnTo } : undefined
    )
  })

export const signUpAction = actionClient
  .schema(signUpSchema)
  .metadata({ actionName: 'signUp' })
  .action(async ({ parsedInput: { email, password, returnTo = '' } }) => {
    const supabase = await createClient()
    const origin = (await headers()).get('origin') || ''

    // basic security check, that password does not equal e-mail
    if (password && email && password.toLowerCase() === email.toLowerCase()) {
      return returnValidationErrors(signUpSchema, {
        password: {
          _errors: ['Password is too weak.'],
        },
      })
    }

    // bot detection
    if (USE_BOT_ID) {
      const verification = await checkBotId()

      if (verification.isBot) {
        l.warn(
          {
            key: 'sign_up_action:bot_detection_triggered',
            context: {
              email,
              verification,
            },
          },
          `Bot detection prevented sign up for: ${email}`
        )

        return returnServerError(
          'Access denied. Please contact support if this issue persists.'
        )
      } else {
        l.info(
          {
            key: 'sign_up_action:bot_detection_passed',
            context: {
              email,
              verification,
            },
          },
          `Bot detection passed sign up for: ${email}`
        )
      }
    }

    // email validation
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

    // sign up
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
    const supabase = await createClient()

    const headerStore = await headers()

    const origin = headerStore.get('origin') || ''

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
