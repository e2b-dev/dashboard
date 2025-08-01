'use client'

import { AUTH_URLS } from '@/configs/urls'
import {
  getTimeoutMsFromUserMessage,
  USER_MESSAGES,
} from '@/configs/user-messages'
import { AuthFormMessage, AuthMessage } from '@/features/auth/form-message'
import { OAuthProviders } from '@/features/auth/oauth-provider-buttons'
import { signUpAction } from '@/server/auth/auth-actions'
import { signUpSchema } from '@/server/auth/auth.types'
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

export default function SignUp() {
  'use no memo'

  const searchParams = useSearchParams()
  const [message, setMessage] = useState<AuthMessage | undefined>(() => {
    const error = searchParams.get('error')
    const success = searchParams.get('success')
    if (error) return { error: decodeURIComponent(error) }
    if (success) return { success: decodeURIComponent(success) }
    return undefined
  })

  // Get returnTo URL from search params
  const returnTo = searchParams.get('returnTo') || ''

  const {
    form,
    handleSubmitWithAction,
    action: { isExecuting },
  } = useHookFormAction(signUpAction, zodResolver(signUpSchema), {
    actionProps: {
      onSuccess: () => {
        setMessage({ success: USER_MESSAGES.signUpVerification.message })
      },
      onError: ({ error }) => {
        if (error.serverError) {
          setMessage({ error: error.serverError })
        }
      },
    },
  })

  useEffect(() => {
    form.setValue('returnTo', returnTo)
  }, [returnTo, form])

  // Handle email prefill
  useEffect(() => {
    const email = searchParams.get('email')
    if (email) {
      form.setValue('email', email)
      form.setFocus('password')
    } else {
      form.setFocus('email')
    }
  }, [searchParams, form])

  useEffect(() => {
    if (message && 'success' in message && message.success) {
      const timer = setTimeout(
        () => setMessage(undefined),
        getTimeoutMsFromUserMessage(message.success) || 5000
      )
      return () => clearTimeout(timer)
    }
  }, [message])

  return (
    <div className="flex w-full flex-col">
      <h1 className="text-2xl font-medium">Sign up</h1>

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
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormLabel htmlFor="password">Password</FormLabel>
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Password"
                    required
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm Password"
                    required
                    autoComplete="new-password"
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
            Sign up
          </Button>
        </form>
      </Form>

      <p className="text-fg-300 mt-3 text-sm leading-6">
        Already have an account?{' '}
        <Link
          className="text-fg font-medium underline"
          href={AUTH_URLS.SIGN_IN}
        >
          Sign in
        </Link>
        .
      </p>
      <p className="text-fg/40 mt-4 text-sm leading-6">
        By signing up, you agree to our{' '}
        <Link href="/terms" target="_blank" className="text-fg/60 font-medium">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link
          href="/privacy"
          target="_blank"
          className="text-fg/60 font-medium"
        >
          Privacy Policy
        </Link>
        .
      </p>

      {message && <AuthFormMessage className="mt-4" message={message} />}
    </div>
  )
}
