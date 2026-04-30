'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks'
import { useEffect, useState } from 'react'
import {
  getTimeoutMsFromUserMessage,
  USER_MESSAGES,
} from '@/configs/user-messages'
import { resendSignupVerificationAction } from '@/core/server/actions/auth-actions'
import { resendSignupVerificationSchema } from '@/core/server/functions/auth/auth.types'
import { AuthFormMessage, type AuthMessage } from '@/features/auth/form-message'
import { Button } from '@/ui/primitives/button'
import { Input } from '@/ui/primitives/input'
import { Label } from '@/ui/primitives/label'
import {
  RESEND_VERIFICATION_BUTTON_LABEL,
  RESEND_VERIFICATION_COOLDOWN_SECONDS,
  RESEND_VERIFICATION_LOADING_LABEL,
} from './constants'
import { useResendVerificationCooldown } from './hooks'

type ResendVerificationProps = {
  initialEmail?: string
  returnTo?: string
  className?: string
}

export function ResendVerificationForm({
  initialEmail,
  returnTo,
  className,
}: ResendVerificationProps) {
  const [message, setMessage] = useState<AuthMessage | undefined>()
  const { isCoolingDown, secondsLeft, startCooldown } =
    useResendVerificationCooldown(RESEND_VERIFICATION_COOLDOWN_SECONDS)

  const {
    form,
    handleSubmitWithAction,
    action: { isExecuting },
  } = useHookFormAction(
    resendSignupVerificationAction,
    zodResolver(resendSignupVerificationSchema),
    {
      actionProps: {
        onSuccess: () => {
          setMessage({ success: USER_MESSAGES.signUpVerificationResend.message })
          startCooldown()
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
    if (initialEmail && !form.getValues('email')) {
      form.setValue('email', initialEmail)
    }
  }, [initialEmail, form])

  useEffect(() => {
    form.setValue('returnTo', returnTo)
  }, [returnTo, form])

  useEffect(() => {
    if (
      message &&
      (('success' in message && message.success) ||
        ('error' in message && message.error))
    ) {
      const content =
        'success' in message
          ? message.success || ''
          : 'error' in message
            ? message.error || ''
            : ''
      const timeoutMs = getTimeoutMsFromUserMessage(content) || 5000
      const timeout = setTimeout(() => setMessage(undefined), timeoutMs)
      return () => clearTimeout(timeout)
    }
  }, [message])

  return (
    <div className={['mt-4 flex flex-col', className].filter(Boolean).join(' ')}>
      <p className="text-fg-secondary leading-6">
        Didn&apos;t get the verification email?
      </p>

      <form
        className="mt-3 flex flex-col gap-2"
        onSubmit={handleSubmitWithAction}
      >
        <Label htmlFor="resend-verification-email">E-Mail</Label>
        <Input
          {...form.register('email')}
          id="resend-verification-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          disabled={isExecuting || isCoolingDown}
        />
        <input type="hidden" {...form.register('returnTo')} />

        <Button
          type="submit"
          loading={isExecuting ? RESEND_VERIFICATION_LOADING_LABEL : undefined}
          disabled={isExecuting || isCoolingDown}
        >
          {isCoolingDown
            ? `Resend available in ${secondsLeft}s`
            : RESEND_VERIFICATION_BUTTON_LABEL}
        </Button>
      </form>

      {message && <AuthFormMessage className="mt-3" message={message} />}
    </div>
  )
}
