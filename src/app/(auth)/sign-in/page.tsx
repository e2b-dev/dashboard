'use client'

import { AUTH_URLS } from '@/configs/urls'
import { USER_MESSAGES } from '@/configs/user-messages'
import { AuthFormMessage, AuthMessage } from '@/features/auth/form-message'
import { OAuthProviders } from '@/features/auth/oauth-provider-buttons'
import { signInAction } from '@/server/auth/auth-actions'
import { signInSchema } from '@/server/auth/auth.types'
import { Button } from '@/ui/primitives/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/ui/primitives/form'
import { Input } from '@/ui/primitives/input'
import TextSeparator from '@/ui/text-separator'
import { zodResolver } from '@hookform/resolvers/zod'
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

export default function Login() {
  'use no memo'

  const searchParams = useSearchParams()

  const [message, setMessage] = useState<AuthMessage | undefined>(() => {
    const error = searchParams.get('error')
    const success = searchParams.get('success')
    if (error) return { error: decodeURIComponent(error) }
    if (success) return { success: decodeURIComponent(success) }
    return undefined
  })

  const {
    form,
    handleSubmitWithAction,
    action: { isExecuting },
  } = useHookFormAction(signInAction, zodResolver(signInSchema), {
    actionProps: {
      onError: ({ error }) => {
        if (
          error.serverError === USER_MESSAGES.signInEmailNotConfirmed.message
        ) {
          setMessage({ success: error.serverError })
          return
        }

        if (error.serverError) {
          setMessage({ error: error.serverError })
        }
      },
    },
  })

  const returnTo = searchParams.get('returnTo') || ''

  useEffect(() => {
    form.setValue('returnTo', returnTo)
  }, [returnTo, form])

  // Handle email prefill from forgot password flow
  useEffect(() => {
    const email = searchParams.get('email')
    if (email) {
      form.setValue('email', email)
      // Focus password field if email is prefilled
      form.setFocus('password')
    } else {
      // Focus email field if no prefill
      form.setFocus('email')
    }
  }, [searchParams, form])

  const handleForgotPassword = () => {
    const email = form.getValues('email')
    const params = new URLSearchParams()
    if (email) params.set('email', email)
    if (returnTo) params.set('returnTo', returnTo)
    window.location.href = `${AUTH_URLS.FORGOT_PASSWORD}?${params.toString()}`
  }

  return (
    <div className="flex w-full flex-col">
      <h1>Sign in</h1>

      <Suspense>
        <OAuthProviders />
      </Suspense>

      <TextSeparator text="or" />

      <Form {...form}>
        <form
          className="flex flex-col gap-2 [&>input]:mb-3"
          onSubmit={handleSubmitWithAction}
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="email">E-Mail</FormLabel>
                <FormControl>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between">
            <FormLabel htmlFor="password">Password</FormLabel>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs underline underline-offset-[3px]"
              tabIndex={-1}
            >
              Forgot Password?
            </button>
          </div>

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••••••"
                    required
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="returnTo"
            render={({ field }) => (
              <FormItem className="hidden">
                <FormControl>
                  <Input type="hidden" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <Button type="submit" loading={isExecuting} className="mt-3">
            Sign in
          </Button>
        </form>
      </Form>

      <p className="text-fg-secondary mt-3  leading-6">
        Don&apos;t have an account?{' '}
        <Link className="text-fg  underline" href={AUTH_URLS.SIGN_UP}>
          Sign up
        </Link>
        .
      </p>

      {message && <AuthFormMessage className="mt-4" message={message} />}
    </div>
  )
}
