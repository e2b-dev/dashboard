'use client'

import { AUTH_URLS } from '@/configs/urls'
import {
  getTimeoutMsFromUserMessage,
  USER_MESSAGES,
} from '@/configs/user-messages'
import { AuthFormMessage, AuthMessage } from '@/features/auth/form-message'
import { forgotPasswordAction } from '@/server/auth/auth-actions'
import { forgotPasswordSchema } from '@/server/auth/auth.types'
import { Button } from '@/ui/primitives/button'
import { Input } from '@/ui/primitives/input'
import { Label } from '@/ui/primitives/label'
import { zodResolver } from '@hookform/resolvers/zod'
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ForgotPassword() {
  const searchParams = useSearchParams()
  const [message, setMessage] = useState<AuthMessage | undefined>()

  const {
    form,
    handleSubmitWithAction,
    action: { isExecuting },
  } = useHookFormAction(
    forgotPasswordAction,
    zodResolver(forgotPasswordSchema),
    {
      actionProps: {
        onSuccess: () => {
          form.reset()
          setMessage({ success: USER_MESSAGES.passwordReset.message })
        },
        onError: ({ error }) => {
          if (error.serverError) {
            setMessage({ error: error.serverError })
          }
        },
      },
    }
  )

  useEffect(() => {
    const email = searchParams.get('email')
    if (email) {
      form.setValue('email', email)
    }
  }, [searchParams, form])

  useEffect(() => {
    if (
      message &&
      (('success' in message && message.success) ||
        ('error' in message && message.error))
    ) {
      const timer = setTimeout(
        () => setMessage(undefined),
        getTimeoutMsFromUserMessage(
          'success' in message
            ? message.success!
            : 'error' in message
              ? message.error!
              : ''
        ) || 5000
      )
      return () => clearTimeout(timer)
    }
  }, [message])

  const handleBackToSignIn = () => {
    const email = form.getValues('email')
    const searchParams = email ? `?email=${encodeURIComponent(email)}` : ''
    window.location.href = `${AUTH_URLS.SIGN_IN}${searchParams}`
  }

  return (
    <div className="flex w-full flex-col">
      <h1>Reset Password</h1>
      <p className="text-fg-secondary leading-6">
        Remember your password?{' '}
        <button
          type="button"
          onClick={handleBackToSignIn}
          className="text-fg  underline"
        >
          Sign in
        </button>
        .
      </p>

      <form
        onSubmit={handleSubmitWithAction}
        className="mt-5 flex flex-col gap-2 [&>input]:mb-1"
      >
        <Label htmlFor="email">E-Mail</Label>
        <Input
          {...form.register('email')}
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
        />
        <Button type="submit" loading={isExecuting}>
          Reset Password
        </Button>
      </form>

      {message && <AuthFormMessage className="mt-4" message={message} />}
    </div>
  )
}
