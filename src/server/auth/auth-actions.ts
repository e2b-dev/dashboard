'use server'

import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { actionClient } from '@/lib/clients/action'
import { l } from '@/lib/clients/logger'
import { createClient } from '@/lib/clients/supabase/server'
import { returnServerError } from '@/lib/utils/action'
import { encodedRedirect } from '@/lib/utils/auth'
import {
  shouldWarnAboutAlternateEmail,
  validateEmail,
} from '@/server/auth/validate-email'
import { Provider } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { zfd } from 'zod-form-data'

export const signInWithOAuthAction = actionClient
  .schema(
    z.object({
      provider: z.string() as unknown as z.ZodType<Provider>,
      returnTo: z.string().optional(),
    })
  )
  .metadata({ actionName: 'signInWithOAuth' })
  .action(async ({ parsedInput, ctx }) => {
    const { provider, returnTo } = parsedInput

    const supabase = await createClient()

    const origin = (await headers()).get('origin')

    l.info({
      key: 'sign_in_with_oauth_action:init',
      provider,
      returnTo,
      origin,
    })

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

const signUpSchema = zfd
  .formData({
    email: zfd.text(z.string().email('Valid email is required')),
    password: zfd.text(
      z.string().min(8, 'Password must be at least 8 characters')
    ),
    confirmPassword: zfd.text(),
    returnTo: zfd.text(z.string().optional()),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export const signUpAction = actionClient
  .schema(signUpSchema)
  .metadata({ actionName: 'signUp' })
  .action(async ({ parsedInput }) => {
    const { email, password, confirmPassword, returnTo = '' } = parsedInput
    const supabase = await createClient()
    const origin = (await headers()).get('origin') || ''

    const validationResult = await validateEmail(email)

    if (validationResult?.data) {
      if (!validationResult.valid) {
        return returnServerError(
          'Please use a valid email address - your company email works best'
        )
      }

      if (await shouldWarnAboutAlternateEmail(validationResult.data)) {
        return returnServerError(
          'Is this a secondary email? Use your primary email for fast access'
        )
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
          return returnServerError('Email already in use')
        case 'weak_password':
          return returnServerError('Password is too weak')
        default:
          throw error
      }
    }
  })

const signInSchema = zfd.formData({
  email: zfd.text(z.string().email('Valid email is required')),
  password: zfd.text(
    z.string().min(8, 'Password must be at least 8 characters')
  ),
  returnTo: zfd.text(z.string().optional()),
})

export const signInAction = actionClient
  .schema(signInSchema)
  .metadata({ actionName: 'signInWithEmailAndPassword' })
  .action(async ({ parsedInput }) => {
    const { email, password, returnTo = '' } = parsedInput
    const supabase = await createClient()

    const headerStore = await headers()

    const origin = headerStore.get('origin') || ''

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.code === 'invalid_credentials') {
        return returnServerError('Invalid credentials')
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

const forgotPasswordSchema = zfd.formData({
  email: zfd.text(z.string().email('Valid email is required')),
  callbackUrl: zfd.text(z.string().optional()),
})

export const forgotPasswordAction = actionClient
  .schema(forgotPasswordSchema)
  .metadata({ actionName: 'forgotPassword' })
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput
    const supabase = await createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email)

    if (error) {
      l.error({ key: 'forgot_password_action:supabase_error', error })

      if (error.message.includes('security purposes')) {
        return returnServerError(
          'Please wait before requesting another password reset'
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
