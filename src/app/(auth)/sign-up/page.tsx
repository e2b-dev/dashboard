'use client'

import { signUpAction } from '@/server/auth/auth-actions'
import { Input } from '@/ui/primitives/input'
import Link from 'next/link'
import { Button } from '@/ui/primitives/button'
import { OAuthProviders } from '@/features/auth/oauth-provider-buttons'
import { AuthFormMessage, AuthMessage } from '@/features/auth/form-message'
import TextSeparator from '@/ui/text-separator'
import { useSearchParams } from 'next/navigation'
import { useEffect, Suspense, useState } from 'react'
import { AUTH_URLS } from '@/configs/urls'
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

const signUpSchema = z
  .object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
    returnTo: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

type SignUpFormValues = z.infer<typeof signUpSchema>

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

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      returnTo,
    },
  })

  const { execute, isExecuting } = useAction(signUpAction, {
    onSuccess: () => {
      setMessage({ success: 'Check your email for a verification link' })
    },
    onError: ({ error }) => {
      if (error.serverError) {
        setMessage({ error: error.serverError })
      }
    },
  })

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

  const onSubmit = (data: SignUpFormValues) => {
    const formData = new FormData()
    formData.append('email', data.email)
    formData.append('password', data.password)
    formData.append('confirmPassword', data.confirmPassword)
    formData.append('returnTo', data.returnTo || '')
    execute(formData)
  }

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
