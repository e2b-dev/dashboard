'use client'

import { signInAction } from '@/server/auth/auth-actions'
import { AuthFormMessage, AuthMessage } from '@/features/auth/form-message'
import { OAuthProviders } from '@/features/auth/oauth-provider-buttons'
import TextSeparator from '@/ui/text-separator'
import { Button } from '@/ui/primitives/button'
import { Input } from '@/ui/primitives/input'
import { AUTH_URLS } from '@/configs/urls'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, Suspense, useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/ui/primitives/form'

const signInSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  returnTo: z.string().optional(),
})

type SignInFormValues = z.infer<typeof signInSchema>

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

  // Get returnTo URL from search params
  const returnTo = searchParams.get('returnTo') || ''

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
      returnTo,
    },
  })

  const { execute, isExecuting } = useAction(signInAction, {
    onError: ({ error }) => {
      if (error.serverError) {
        setMessage({ error: error.serverError })
      } else if (error.validationErrors) {
        setMessage({ error: 'Please check your credentials' })
      }
    },
  })

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

  const onSubmit = (data: SignInFormValues) => {
    const formData = new FormData()
    formData.append('email', data.email)
    formData.append('password', data.password)
    formData.append('returnTo', data.returnTo || '')
    execute(formData)
  }

  return (
    <div className="flex w-full flex-col">
      <h1 className="text-2xl font-medium">Sign in</h1>

      <Suspense>
        <OAuthProviders />
      </Suspense>

      <TextSeparator text="or" />

      <Form {...form}>
        <form
          className="flex flex-col gap-2 [&>input]:mb-3"
          onSubmit={form.handleSubmit(onSubmit)}
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

      <p className="text-fg-300 mt-3 text-sm leading-6">
        Don&apos;t have an account?{' '}
        <Link
          className="text-fg font-medium underline"
          href={AUTH_URLS.SIGN_UP}
        >
          Sign up
        </Link>
      </p>

      {message && <AuthFormMessage className="mt-4" message={message} />}
    </div>
  )
}
